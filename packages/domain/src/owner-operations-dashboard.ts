/**
 * Owner mobile operations dashboard aggregates (store-scoped).
 * Server loads raw rows; domain computes summaries — never authoritative on client.
 */

import { kstDayBoundsUtc } from './join-discovery';
import {
  computeStoreOwnershipKpi,
  isStoreKpiSucceededStatus,
  type StoreKpiJoinLike,
} from './store-ownership-kpi';

export type OwnerOpsJoinLike = StoreKpiJoinLike & {
  id: string;
  title?: string | null;
  isUrgent?: boolean | null;
};

export type OwnerOpsParticipantLike = {
  joinId: string;
  participationStatus: string;
};

export type OwnerOpsSettlementLike = {
  joinId: string;
  amount: number;
  rewardStatus: string;
  paidAt?: Date | string | null;
};

export type OwnerTodaySummary = {
  scheduledCount: number;
  recruitingCount: number;
  settlementPendingCount: number;
  completedCount: number;
};

export type OwnerParticipantSummary = {
  totalExpected: number;
  confirmedCount: number;
  pendingCount: number;
  noShowCount: number;
};

export type OwnerSettlementSummary = {
  pendingCount: number;
  payoutDueCoin: string;
  holdCoin: string;
  paidTodayCoin: string;
};

export type OwnerPeriodStats = {
  createdJoinCount: number;
  completedJoinCount: number;
  participantCount: number;
  attendedCount: number;
  noShowCount: number;
  fillRatePercent: number | null;
};

export function isJoinOnKstDate(join: StoreKpiJoinLike, dateKey: string): boolean {
  const { start, end } = kstDayBoundsUtc(dateKey);
  const t = new Date(join.startAt).getTime();
  return Number.isFinite(t) && t >= start.getTime() && t < end.getTime();
}

export function buildOwnerTodaySummary(joins: OwnerOpsJoinLike[]): OwnerTodaySummary {
  let scheduledCount = 0;
  let recruitingCount = 0;
  let settlementPendingCount = 0;
  let completedCount = 0;

  for (const join of joins) {
    if (join.status === 'DRAFT' || join.status === 'CANCELLED') continue;
    if (join.status === 'CONFIRMED' || join.status === 'IN_PROGRESS') scheduledCount += 1;
    if (join.status === 'OPEN' || join.status === 'FULL') recruitingCount += 1;
    if (join.status === 'SETTLING') settlementPendingCount += 1;
    if (join.status === 'COMPLETED') completedCount += 1;
  }

  return {
    scheduledCount,
    recruitingCount,
    settlementPendingCount,
    completedCount,
  };
}

const CONFIRMED_PARTICIPANT = new Set(['CONFIRMED', 'COMPLETED']);
const PENDING_PARTICIPANT = new Set(['APPLIED', 'APPROVED']);

export function buildOwnerParticipantSummary(
  participants: OwnerOpsParticipantLike[],
): OwnerParticipantSummary {
  let confirmedCount = 0;
  let pendingCount = 0;
  let noShowCount = 0;

  for (const row of participants) {
    if (row.participationStatus === 'NO_SHOW') {
      noShowCount += 1;
      continue;
    }
    if (CONFIRMED_PARTICIPANT.has(row.participationStatus)) confirmedCount += 1;
    if (PENDING_PARTICIPANT.has(row.participationStatus)) pendingCount += 1;
  }

  return {
    totalExpected: confirmedCount + pendingCount + noShowCount,
    confirmedCount,
    pendingCount,
    noShowCount,
  };
}

function sumCoinAmount(rows: OwnerOpsSettlementLike[]): number {
  return rows.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
}

export function buildOwnerSettlementSummary(
  settlements: OwnerOpsSettlementLike[],
  settlingJoinIds: Set<string>,
  todayStart: Date,
  todayEnd: Date,
): OwnerSettlementSummary {
  const pendingJoinIds = new Set<string>();
  const payoutDue: OwnerOpsSettlementLike[] = [];
  const held: OwnerOpsSettlementLike[] = [];
  const paidToday: OwnerOpsSettlementLike[] = [];

  for (const row of settlements) {
    if (row.rewardStatus === 'HELD') held.push(row);
    if (row.rewardStatus === 'PENDING_CONFIRMATION') {
      payoutDue.push(row);
      pendingJoinIds.add(row.joinId);
    }
    if (row.rewardStatus === 'PAID' || row.rewardStatus === 'AUTO_PAID') {
      const paidAt = row.paidAt ? new Date(row.paidAt).getTime() : NaN;
      if (Number.isFinite(paidAt) && paidAt >= todayStart.getTime() && paidAt < todayEnd.getTime()) {
        paidToday.push(row);
      }
    }
  }

  for (const joinId of settlingJoinIds) pendingJoinIds.add(joinId);

  return {
    pendingCount: pendingJoinIds.size,
    payoutDueCoin: String(sumCoinAmount(payoutDue)),
    holdCoin: String(sumCoinAmount(held)),
    paidTodayCoin: String(sumCoinAmount(paidToday)),
  };
}

export function buildOwnerPeriodStats(input: {
  joins: OwnerOpsJoinLike[];
  participants: OwnerOpsParticipantLike[];
  periodDays: number;
  now?: Date;
}): OwnerPeriodStats {
  const now = input.now ?? new Date();
  const periodStart = new Date(now.getTime() - input.periodDays * 24 * 60 * 60_000);
  const joinsInPeriod = input.joins.filter((j) => {
    const t = new Date(j.startAt).getTime();
    return Number.isFinite(t) && t >= periodStart.getTime();
  });
  const joinIds = new Set(joinsInPeriod.map((j) => j.id));
  const participantsInPeriod = input.participants.filter((p) => joinIds.has(p.joinId));

  const createdJoinCount = joinsInPeriod.filter((j) => j.status !== 'DRAFT').length;
  const completedJoinCount = joinsInPeriod.filter((j) => j.status === 'COMPLETED').length;

  let participantCount = 0;
  let attendedCount = 0;
  let noShowCount = 0;
  let totalCapacity = 0;
  let filledSeats = 0;

  for (const join of joinsInPeriod) {
    if (join.status === 'DRAFT' || join.status === 'CANCELLED') continue;
    totalCapacity += Math.max(0, join.plannedPlayerCount ?? 0);
    filledSeats += Math.max(0, join.confirmedPlayerCount ?? 0);
  }

  for (const row of participantsInPeriod) {
    if (row.participationStatus === 'CANCELLED') continue;
    participantCount += 1;
    if (row.participationStatus === 'COMPLETED') attendedCount += 1;
    if (row.participationStatus === 'NO_SHOW') noShowCount += 1;
  }

  const fillRatePercent =
    totalCapacity === 0 ? null : Math.round((filledSeats / totalCapacity) * 1000) / 10;

  return {
    createdJoinCount,
    completedJoinCount,
    participantCount,
    attendedCount,
    noShowCount,
    fillRatePercent,
  };
}

export function ownerJoinActionPriority(join: OwnerOpsJoinLike): number {
  if (join.status === 'SETTLING') return 0;
  if (join.status === 'CONFIRMED' || join.status === 'IN_PROGRESS') return 1;
  if (join.status === 'OPEN' || join.status === 'FULL') return 2;
  if (join.status === 'COMPLETED') return 3;
  if (join.status === 'CANCELLED') return 5;
  return 4;
}

export function sortOwnerTodayJoins<T extends OwnerOpsJoinLike>(joins: T[]): T[] {
  return [...joins].sort((a, b) => {
    const priorityDiff = ownerJoinActionPriority(a) - ownerJoinActionPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
}

export function ownerJoinRecruitLabel(status: string): string {
  if (status === 'OPEN' || status === 'FULL') return '모집 중';
  if (status === 'SETTLING') return '정산 필요';
  if (status === 'CONFIRMED' || status === 'IN_PROGRESS') return '진행 예정';
  if (status === 'COMPLETED') return '완료';
  if (status === 'CANCELLED') return '취소';
  return '진행';
}

export function ownerJoinNeedsSettlement(status: string): boolean {
  return status === 'SETTLING';
}

export { computeStoreOwnershipKpi, isStoreKpiSucceededStatus };
