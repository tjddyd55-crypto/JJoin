/**
 * Owner mobile dashboard extras on top of Admin Store KPI SSOT.
 * Core attempt/succeed/cancel/rate/participants stay in store-ownership-kpi.ts.
 */

import {
  computeStoreOwnershipKpi,
  filterJoinsByKpiPeriod,
  type StoreKpiJoinLike,
  type StoreKpiPeriod,
  type StoreOwnershipKpi,
} from './store-ownership-kpi';

/** Mobile dashboard periods: calendar month, rolling 30d, all-time. */
export type OwnerDashboardPeriod = 'month' | '30d' | 'all';

export type OwnerDashboardJoinLike = StoreKpiJoinLike & {
  id: string;
  isUrgent?: boolean | null;
  /** True if this join was ever activated as urgent (optional; falls back to isUrgent). */
  wasUrgent?: boolean | null;
};

export type AttendedParticipantLike = {
  joinId: string;
  userId: string;
  participationStatus: string;
};

export type OwnerDashboardExtras = {
  reParticipantCount: number;
  followerCount: number;
  urgentAttemptCount: number;
  urgentSucceededCount: number;
};

export type OwnerDashboardKpi = StoreOwnershipKpi & OwnerDashboardExtras;

export function ownerDashboardPeriodStart(
  period: OwnerDashboardPeriod,
  now = new Date(),
  timeZone = 'Asia/Seoul',
): Date | null {
  if (period === 'all') return null;
  if (period === '30d') {
    return new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  }
  // Calendar month in local TZ (KST): first instant of current month.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  // KST midnight = UTC previous day 15:00
  return new Date(`${y}-${m}-01T00:00:00+09:00`);
}

export function filterJoinsByOwnerDashboardPeriod<T extends StoreKpiJoinLike>(
  joins: T[],
  period: OwnerDashboardPeriod,
  now = new Date(),
): T[] {
  if (period === '30d') {
    return filterJoinsByKpiPeriod(joins, '30d' satisfies StoreKpiPeriod, now);
  }
  const start = ownerDashboardPeriodStart(period, now);
  if (!start) return joins;
  const startMs = start.getTime();
  return joins.filter((j) => {
    const t = new Date(j.startAt).getTime();
    return Number.isFinite(t) && t >= startMs;
  });
}

/**
 * Users who ATTENDED (COMPLETED) at least 2 distinct joins at this store.
 * NO_SHOW / CANCELLED excluded. Host may count if COMPLETED.
 */
export function computeReParticipantCount(
  rows: AttendedParticipantLike[],
): number {
  const byUser = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.participationStatus !== 'COMPLETED') continue;
    let set = byUser.get(row.userId);
    if (!set) {
      set = new Set();
      byUser.set(row.userId, set);
    }
    set.add(row.joinId);
  }
  let count = 0;
  for (const joins of byUser.values()) {
    if (joins.size >= 2) count += 1;
  }
  return count;
}

function joinWasUrgent(join: OwnerDashboardJoinLike): boolean {
  if (join.wasUrgent === true) return true;
  return join.isUrgent === true;
}

/** Urgent success = FULL (filled) or confirmation pipeline (CONFIRMED+). */
export function computeUrgentKpi(joins: OwnerDashboardJoinLike[]): {
  urgentAttemptCount: number;
  urgentSucceededCount: number;
} {
  const SUCCESS = new Set([
    'FULL',
    'CONFIRMED',
    'IN_PROGRESS',
    'SETTLING',
    'COMPLETED',
  ]);
  let urgentAttemptCount = 0;
  let urgentSucceededCount = 0;
  for (const join of joins) {
    if (join.status === 'DRAFT') continue;
    if (!joinWasUrgent(join)) continue;
    urgentAttemptCount += 1;
    if (SUCCESS.has(join.status)) urgentSucceededCount += 1;
  }
  return { urgentAttemptCount, urgentSucceededCount };
}

export function buildOwnerDashboardKpi(input: {
  joins: OwnerDashboardJoinLike[];
  attendedRows: AttendedParticipantLike[];
  followerCount: number;
  period: OwnerDashboardPeriod;
  now?: Date;
}): OwnerDashboardKpi {
  const filtered = filterJoinsByOwnerDashboardPeriod(
    input.joins,
    input.period,
    input.now,
  );
  const filteredIds = new Set(filtered.map((j) => j.id));
  const attendedInPeriod = input.attendedRows.filter((r) =>
    filteredIds.has(r.joinId),
  );
  const base = computeStoreOwnershipKpi(filtered);
  const urgent = computeUrgentKpi(filtered);
  return {
    ...base,
    reParticipantCount: computeReParticipantCount(attendedInPeriod),
    followerCount: Math.max(0, input.followerCount),
    urgentAttemptCount: urgent.urgentAttemptCount,
    urgentSucceededCount: urgent.urgentSucceededCount,
  };
}
