/**
 * Phase B reward seed path: DailyAttendanceCheckIn + UserAttendanceStats +
 * RewardGrant + CoinLedgerService(EVENT_REWARD) using production idempotency keys.
 * In-app notifications only — no NotificationOutbox (no FCM).
 */
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  attendanceGrantIdempotencyKey,
  attendanceKstDateKey,
  attendanceRewardNotificationEventKey,
  achievementRewardNotificationEventKey,
  computeAttendanceStreakFromDates,
  milestoneGrantIdempotencyKey,
  shiftKstDateKey,
} from '../../packages/domain/src/attendance-rewards.ts';
import { kstDateParts } from '../../packages/domain/src/club-stats-period.ts';
import { CoinIssuanceType } from '../../packages/types/src/index.ts';
import type { CoinLedgerService } from '../../apps/api/src/modules/wallet/coin-ledger.service.ts';
import { investorDemoTransactionOptions } from './investor-demo-guard.ts';

export function listRecentKstDates(days: number, includeToday: boolean, todayKst: string): string[] {
  const count = Math.max(0, days);
  const dates: string[] = [];
  const startOffset = includeToday ? 0 : 1;
  for (let i = startOffset; i < startOffset + count; i += 1) {
    dates.push(shiftKstDateKey(todayKst, -i));
  }
  return dates.sort();
}

export function todayKstDate(now = new Date()): string {
  return attendanceKstDateKey(kstDateParts(now));
}

export async function seedAttendanceHistory(input: {
  prisma: PrismaClient;
  ledger: CoinLedgerService;
  userId: string;
  dates: string[];
  amount: string;
}): Promise<{ created: number; reused: number; streak: ReturnType<typeof computeAttendanceStreakFromDates> }> {
  await input.ledger.getOrCreateWallet(input.userId);
  let created = 0;
  let reused = 0;
  for (const kstDate of input.dates) {
    const result = await upsertAttendanceDay({
      prisma: input.prisma,
      ledger: input.ledger,
      userId: input.userId,
      kstDate,
      amount: input.amount,
    });
    if (result === 'created') created += 1;
    else reused += 1;
  }
  const today = todayKstDate();
  const streak = computeAttendanceStreakFromDates(input.dates, today);
  await input.prisma.userAttendanceStats.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      totalDays: streak.totalDays,
      lastCheckInKstDate: input.dates[input.dates.length - 1] ?? null,
    },
    update: {
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      totalDays: streak.totalDays,
      lastCheckInKstDate: input.dates[input.dates.length - 1] ?? null,
    },
  });
  return { created, reused, streak };
}

async function upsertAttendanceDay(input: {
  prisma: PrismaClient;
  ledger: CoinLedgerService;
  userId: string;
  kstDate: string;
  amount: string;
}): Promise<'created' | 'reused'> {
  const existing = await input.prisma.dailyAttendanceCheckIn.findUnique({
    where: { userId_kstDate: { userId: input.userId, kstDate: input.kstDate } },
  });
  if (existing) return 'reused';

  const idempotencyKey = attendanceGrantIdempotencyKey(input.userId, input.kstDate);
  await input.prisma.$transaction(async (tx) => {
    const issuance = await input.ledger.issueCoins(
      {
        userId: input.userId,
        amount: input.amount,
        issuanceType: CoinIssuanceType.EVENT_REWARD,
        reason: 'DAILY_ATTENDANCE',
        referenceType: 'DAILY_ATTENDANCE',
        referenceId: input.kstDate,
        idempotencyKey,
      },
      tx,
    );
    const grant = await tx.rewardGrant.upsert({
      where: { idempotencyKey },
      create: {
        id: randomUUID(),
        userId: input.userId,
        kind: 'ATTENDANCE',
        milestoneKey: input.kstDate,
        amount: input.amount,
        issuanceId: issuance.issuanceId,
        idempotencyKey,
      },
      update: { issuanceId: issuance.issuanceId },
    });
    await tx.dailyAttendanceCheckIn.upsert({
      where: { userId_kstDate: { userId: input.userId, kstDate: input.kstDate } },
      create: {
        id: randomUUID(),
        userId: input.userId,
        kstDate: input.kstDate,
        amount: input.amount,
        grantId: grant.id,
      },
      update: { amount: input.amount, grantId: grant.id },
    });
  }, investorDemoTransactionOptions());
  await ensureInAppNotification(input.prisma, {
    userId: input.userId,
    type: 'ATTENDANCE_REWARD',
    title: '오늘 출석 완료',
    body: `${input.amount}코인 지급`,
    eventKey: attendanceRewardNotificationEventKey(input.userId, input.kstDate),
    data: { kstDate: input.kstDate, amount: input.amount },
  });
  return 'created';
}

export async function seedReachedMilestones(input: {
  prisma: PrismaClient;
  ledger: CoinLedgerService;
  userId: string;
  hostCount: number;
  participationCount: number;
  hostMilestones: Array<{ threshold: number; amount: string }>;
  participationMilestones: Array<{ threshold: number; amount: string }>;
}): Promise<{ created: number; reused: number }> {
  let created = 0;
  let reused = 0;
  for (const milestone of input.hostMilestones) {
    if (input.hostCount < milestone.threshold) continue;
    const result = await upsertMilestoneGrant({
      prisma: input.prisma,
      ledger: input.ledger,
      userId: input.userId,
      kind: 'HOST_MILESTONE',
      threshold: milestone.threshold,
      amount: milestone.amount,
    });
    if (result === 'created') created += 1;
    else reused += 1;
  }
  for (const milestone of input.participationMilestones) {
    if (input.participationCount < milestone.threshold) continue;
    const result = await upsertMilestoneGrant({
      prisma: input.prisma,
      ledger: input.ledger,
      userId: input.userId,
      kind: 'PARTICIPATION_MILESTONE',
      threshold: milestone.threshold,
      amount: milestone.amount,
    });
    if (result === 'created') created += 1;
    else reused += 1;
  }
  return { created, reused };
}

async function upsertMilestoneGrant(input: {
  prisma: PrismaClient;
  ledger: CoinLedgerService;
  userId: string;
  kind: 'HOST_MILESTONE' | 'PARTICIPATION_MILESTONE';
  threshold: number;
  amount: string;
}): Promise<'created' | 'reused'> {
  const idempotencyKey = milestoneGrantIdempotencyKey(input.kind, input.userId, input.threshold);
  const existing = await input.prisma.rewardGrant.findUnique({ where: { idempotencyKey } });
  if (existing) return 'reused';
  await input.prisma.$transaction(async (tx) => {
    const issuance = await input.ledger.issueCoins(
      {
        userId: input.userId,
        amount: input.amount,
        issuanceType: CoinIssuanceType.EVENT_REWARD,
        reason: input.kind,
        referenceType: input.kind,
        referenceId: String(input.threshold),
        idempotencyKey,
      },
      tx,
    );
    await tx.rewardGrant.upsert({
      where: { idempotencyKey },
      create: {
        id: randomUUID(),
        userId: input.userId,
        kind: input.kind,
        milestoneKey: String(input.threshold),
        amount: input.amount,
        issuanceId: issuance.issuanceId,
        idempotencyKey,
      },
      update: {},
    });
  }, investorDemoTransactionOptions());
  const label = input.kind === 'HOST_MILESTONE' ? '호스트' : '참가';
  await ensureInAppNotification(input.prisma, {
    userId: input.userId,
    type: 'ACHIEVEMENT_REWARD',
    title: `${label} 업적 달성`,
    body: `${input.threshold}회 성사 · ${input.amount}코인 지급`,
    eventKey: achievementRewardNotificationEventKey(input.kind, input.userId, input.threshold),
    data: { kind: input.kind, threshold: input.threshold, amount: input.amount },
  });
  return 'created';
}

async function ensureInAppNotification(
  prisma: PrismaClient,
  input: {
    userId: string;
    type: 'ATTENDANCE_REWARD' | 'ACHIEVEMENT_REWARD';
    title: string;
    body: string;
    eventKey: string;
    data: Record<string, unknown>;
  },
): Promise<void> {
  await prisma.appNotification.upsert({
    where: { eventKey: input.eventKey },
    create: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      eventKey: input.eventKey,
      data: input.data,
    },
    update: {},
  });
}
