import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NotificationType, Prisma } from '@prisma/client';
import {
  DEFAULT_HOST_MILESTONES,
  DEFAULT_PARTICIPATION_MILESTONES,
  DEFAULT_REWARD_POLICY,
  REWARD_POLICY_SETTINGS_ID,
  achievementRewardNotificationEventKey,
  achievementRewardToast,
  attendanceGrantIdempotencyKey,
  attendanceKstDateKey,
  attendanceRewardNotificationEventKey,
  attendanceRewardToast,
  computeAttendanceStreakFromDates,
  isSuccessfulHostedJoin,
  isSuccessfulParticipationStatus,
  kstDateParts,
  listGrantableMilestones,
  milestoneGrantIdempotencyKey,
  milestoneProgress,
  milestoneProgressList,
  nextAttendanceStreak,
  normalizeRewardMilestones,
  parseRewardMilestones,
  primaryMilestone,
  resolveRewardMilestones,
  shouldGrantDailyAttendance,
  validateRewardPolicy,
} from '@jjoin/domain';
import type {
  AttendanceCheckInDto,
  RewardGrantDto,
  RewardGrantKind,
  RewardMilestoneDto,
  RewardPolicyDto,
  RewardProgressDto,
  RewardToastDto,
  RewardTrackProgressDto,
} from '@jjoin/types';
import { CoinIssuanceType } from '@jjoin/types';
import { updateRewardPolicySchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { CoinLedgerService } from '../wallet/coin-ledger.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { FeatureFlagsService } from './feature-flags.service';

type NewlyGrantedMilestone = AttendanceCheckInDto['newlyGrantedMilestones'][number];

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
    private readonly flags: FeatureFlagsService,
    private readonly notifications: NotificationEventService,
  ) {}

  async getPolicy(): Promise<RewardPolicyDto> {
    const row = await this.prisma.rewardPolicySettings.upsert({
      where: { id: REWARD_POLICY_SETTINGS_ID },
      create: {
        id: REWARD_POLICY_SETTINGS_ID,
        hostThreshold: DEFAULT_HOST_MILESTONES[0].threshold,
        hostAmount: DEFAULT_HOST_MILESTONES[0].amount,
        participationThreshold: DEFAULT_PARTICIPATION_MILESTONES[0].threshold,
        participationAmount: DEFAULT_PARTICIPATION_MILESTONES[0].amount,
        hostMilestones: DEFAULT_HOST_MILESTONES,
        participationMilestones: DEFAULT_PARTICIPATION_MILESTONES,
      },
      update: {},
    });
    return this.toPolicyDto(row);
  }

  async updatePolicy(body: unknown, updatedBy?: string): Promise<RewardPolicyDto> {
    const parsed = updateRewardPolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'reward_policy_invalid', issues: parsed.error.issues });
    }
    const current = await this.getPolicy();
    const next = this.mergePolicy(current, parsed.data);
    const valid = validateRewardPolicy(next);
    if (!valid.ok) throw new BadRequestException(valid.code);
    await this.prisma.rewardPolicySettings.upsert({
      where: { id: REWARD_POLICY_SETTINGS_ID },
      create: {
        id: REWARD_POLICY_SETTINGS_ID,
        ...this.toPolicyWrite(next),
        updatedBy: updatedBy ?? null,
      },
      update: {
        ...this.toPolicyWrite(next),
        updatedBy: updatedBy ?? null,
      },
    });
    return this.getPolicy();
  }

  async getProgress(userId: string): Promise<RewardProgressDto> {
    await this.evaluateMilestones(userId);
    return this.readProgress(userId);
  }

  /** Soft check-in for app entry. Never throws for already-checked-in / disabled. */
  async pingAttendance(userId: string): Promise<AttendanceCheckInDto> {
    return this.checkIn(userId);
  }

  async checkIn(userId: string): Promise<AttendanceCheckInDto> {
    const flags = await this.flags.getFlags();
    const kstDate = attendanceKstDateKey(kstDateParts(new Date()));
    if (!flags.attendanceRewardsEnabled) {
      return this.buildCheckInResult({
        userId,
        kstDate,
        granted: false,
        alreadyCheckedIn: false,
        disabled: true,
        amount: '0',
      });
    }

    const policy = await this.getPolicy();
    const existing = await this.prisma.dailyAttendanceCheckIn.findUnique({
      where: { userId_kstDate: { userId, kstDate } },
    });
    if (existing || !shouldGrantDailyAttendance({ policy, alreadyCheckedIn: Boolean(existing) })) {
      return this.buildCheckInResult({
        userId,
        kstDate,
        granted: false,
        alreadyCheckedIn: true,
        disabled: false,
        amount: existing ? String(existing.amount) : '0',
      });
    }

    try {
      await this.recordAttendance(userId, kstDate, policy.attendanceAmount);
    } catch (error) {
      if (this.isUniqueConflict(error)) {
        return this.buildCheckInResult({
          userId,
          kstDate,
          granted: false,
          alreadyCheckedIn: true,
          disabled: false,
          amount: policy.attendanceAmount,
        });
      }
      throw error;
    }

    return this.buildCheckInResult({
      userId,
      kstDate,
      granted: true,
      alreadyCheckedIn: false,
      disabled: false,
      amount: policy.attendanceAmount,
    });
  }

  async listHistory(userId: string): Promise<RewardGrantDto[]> {
    const rows = await this.prisma.rewardGrant.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind as RewardGrantKind,
      amount: String(row.amount),
      milestoneKey: row.milestoneKey,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async evaluateMilestones(userId: string): Promise<NewlyGrantedMilestone[]> {
    const flags = await this.flags.getFlags();
    if (!flags.attendanceRewardsEnabled) return [];
    const policy = await this.getPolicy();
    const milestones = resolveRewardMilestones(policy);
    const [hostCount, participationCount] = await Promise.all([
      this.countSuccessfulHostedJoins(userId),
      this.countSuccessfulParticipations(userId),
    ]);
    const granted = [
      ...(await this.grantReachedMilestones({
        userId,
        kind: 'HOST_MILESTONE',
        enabled: policy.hostEnabled,
        milestones: milestones.host,
        currentCount: hostCount,
      })),
      ...(await this.grantReachedMilestones({
        userId,
        kind: 'PARTICIPATION_MILESTONE',
        enabled: policy.participationEnabled,
        milestones: milestones.participation,
        currentCount: participationCount,
      })),
    ];
    return granted;
  }

  /** After join settlement/matching commit. Never throws to callers. */
  async evaluateAfterJoinCompleted(joinId: string): Promise<void> {
    try {
      const join = await this.prisma.join.findUnique({
        where: { id: joinId },
        select: {
          status: true,
          hostUserId: true,
          participants: {
            select: { userId: true, role: true, participationStatus: true },
          },
        },
      });
      if (!join) return;
      const userIds = new Set<string>();
      if (isSuccessfulHostedJoin(join.status)) {
        userIds.add(join.hostUserId);
      }
      for (const participant of join.participants) {
        if (
          participant.role === 'PARTICIPANT' &&
          isSuccessfulParticipationStatus(participant.participationStatus)
        ) {
          userIds.add(participant.userId);
        }
      }
      for (const userId of userIds) {
        await this.evaluateMilestones(userId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'evaluate_failed';
      this.logger.warn(`achievement_evaluate_failed joinId=${joinId} err=${message}`);
    }
  }

  private async recordAttendance(userId: string, kstDate: string, amount: string): Promise<void> {
    const idempotencyKey = attendanceGrantIdempotencyKey(userId, kstDate);
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.dailyAttendanceCheckIn.findUnique({
        where: { userId_kstDate: { userId, kstDate } },
      });
      if (existing) return { created: false as const, streak: null };

      const [stats, dateRows] = await Promise.all([
        tx.userAttendanceStats.findUnique({ where: { userId } }),
        tx.dailyAttendanceCheckIn.findMany({
          where: { userId },
          select: { kstDate: true },
        }),
      ]);
      const previousDates = dateRows.map((row) => row.kstDate).sort();
      const recomputed = computeAttendanceStreakFromDates(previousDates, kstDate);
      const lastCheckInKstDate =
        stats?.lastCheckInKstDate ?? previousDates[previousDates.length - 1] ?? null;
      const streak = nextAttendanceStreak({
        lastCheckInKstDate,
        previousCurrentStreak: stats?.currentStreak ?? recomputed.currentStreak,
        previousBestStreak: Math.max(stats?.bestStreak ?? 0, recomputed.bestStreak),
        previousTotalDays: stats?.totalDays ?? recomputed.totalDays,
        todayKst: kstDate,
      });

      const amountNumber = Number(amount);
      const issuance =
        Number.isFinite(amountNumber) && amountNumber > 0
          ? await this.ledger.issueCoins(
              {
                userId,
                amount,
                issuanceType: CoinIssuanceType.EVENT_REWARD,
                reason: 'DAILY_ATTENDANCE',
                referenceType: 'DAILY_ATTENDANCE',
                referenceId: kstDate,
                idempotencyKey,
              },
              tx,
            )
          : null;

      const grant = await tx.rewardGrant.create({
        data: {
          id: randomUUID(),
          userId,
          kind: 'ATTENDANCE',
          milestoneKey: kstDate,
          amount,
          issuanceId: issuance?.issuanceId ?? null,
          idempotencyKey,
        },
      });
      await tx.dailyAttendanceCheckIn.create({
        data: {
          id: randomUUID(),
          userId,
          kstDate,
          amount,
          grantId: grant.id,
        },
      });
      await tx.userAttendanceStats.upsert({
        where: { userId },
        create: {
          userId,
          currentStreak: streak.currentStreak,
          bestStreak: streak.bestStreak,
          totalDays: streak.totalDays,
          lastCheckInKstDate: kstDate,
        },
        update: {
          currentStreak: streak.currentStreak,
          bestStreak: streak.bestStreak,
          totalDays: streak.totalDays,
          lastCheckInKstDate: kstDate,
        },
      });
      return { created: true as const, streak };
    });

    if (result.created && result.streak) {
      await this.notifications.enqueueTypedSafe({
        userId,
        type: NotificationType.ATTENDANCE_REWARD,
        targetEntityId: kstDate,
        context: {
          rewardAmount: amount,
          currentStreak: result.streak.currentStreak,
        },
        data: { kstDate, amount, currentStreak: result.streak.currentStreak },
        eventKey: attendanceRewardNotificationEventKey(userId, kstDate),
      });
    }
  }

  private async grantReachedMilestones(input: {
    userId: string;
    kind: 'HOST_MILESTONE' | 'PARTICIPATION_MILESTONE';
    enabled: boolean;
    milestones: RewardMilestoneDto[];
    currentCount: number;
  }): Promise<NewlyGrantedMilestone[]> {
    const existing = await this.prisma.rewardGrant.findMany({
      where: { userId: input.userId, kind: input.kind },
      select: { milestoneKey: true },
    });
    const grantedThresholds = new Set(
      existing.map((row) => Number(row.milestoneKey)).filter((value) => Number.isInteger(value)),
    );
    const due = listGrantableMilestones({
      enabled: input.enabled,
      milestones: input.milestones,
      currentCount: input.currentCount,
      grantedThresholds,
    });
    const newly: NewlyGrantedMilestone[] = [];
    for (const milestone of due) {
      const granted = await this.grantOneMilestone({
        userId: input.userId,
        kind: input.kind,
        threshold: milestone.threshold,
        amount: milestone.amount,
      });
      if (granted) newly.push(granted);
    }
    return newly;
  }

  private async grantOneMilestone(input: {
    userId: string;
    kind: 'HOST_MILESTONE' | 'PARTICIPATION_MILESTONE';
    threshold: number;
    amount: string;
  }): Promise<NewlyGrantedMilestone | null> {
    const idempotencyKey = milestoneGrantIdempotencyKey(input.kind, input.userId, input.threshold);
    const issuance = await this.ledger.issueCoins({
      userId: input.userId,
      amount: input.amount,
      issuanceType: CoinIssuanceType.EVENT_REWARD,
      reason: input.kind,
      referenceType: input.kind,
      referenceId: String(input.threshold),
      idempotencyKey,
    });
    try {
      await this.prisma.rewardGrant.create({
        data: {
          id: randomUUID(),
          userId: input.userId,
          kind: input.kind,
          milestoneKey: String(input.threshold),
          amount: input.amount,
          issuanceId: issuance.issuanceId,
          idempotencyKey,
        },
      });
    } catch (error) {
      if (this.isUniqueConflict(error)) return null;
      throw error;
    }
    const toast = achievementRewardToast({
      kind: input.kind,
      threshold: input.threshold,
      amount: input.amount,
    });
    await this.notifications.enqueueTypedSafe({
      userId: input.userId,
      type: NotificationType.ACHIEVEMENT_REWARD,
      targetEntityId: `${input.kind}:${input.threshold}`,
      context: {
        achievementKind: input.kind,
        milestoneThreshold: input.threshold,
        rewardAmount: input.amount,
      },
      data: {
        kind: input.kind,
        threshold: input.threshold,
        amount: input.amount,
      },
      eventKey: achievementRewardNotificationEventKey(input.kind, input.userId, input.threshold),
    });
    return {
      kind: input.kind as RewardGrantKind,
      threshold: input.threshold,
      amount: input.amount,
      toast,
    };
  }

  private async buildCheckInResult(input: {
    userId: string;
    kstDate: string;
    granted: boolean;
    alreadyCheckedIn: boolean;
    disabled: boolean;
    amount: string;
  }): Promise<AttendanceCheckInDto> {
    const newlyGrantedMilestones = input.disabled ? [] : await this.evaluateMilestones(input.userId);
    const progress = await this.readProgress(input.userId);
    const toast: RewardToastDto | null = attendanceRewardToast({
      granted: input.granted,
      amount: input.amount,
      currentStreak: progress.currentStreak,
    });
    return {
      kstDate: input.kstDate,
      granted: input.granted,
      alreadyCheckedIn: input.alreadyCheckedIn,
      disabled: input.disabled,
      amount: input.amount,
      currentStreak: progress.currentStreak,
      bestStreak: progress.bestStreak,
      totalAttendanceDays: progress.totalAttendanceDays,
      toast,
      newlyGrantedMilestones,
      progress,
    };
  }

  private async readProgress(userId: string): Promise<RewardProgressDto> {
    const flags = await this.flags.getFlags();
    const policy = flags.attendanceRewardsEnabled ? await this.getPolicy() : DEFAULT_REWARD_POLICY;
    const milestones = resolveRewardMilestones(policy);
    const kstDate = attendanceKstDateKey(kstDateParts(new Date()));
    const [checkIn, hostCount, participationCount, grants, stats] = await Promise.all([
      this.prisma.dailyAttendanceCheckIn.findUnique({
        where: { userId_kstDate: { userId, kstDate } },
      }),
      this.countSuccessfulHostedJoins(userId),
      this.countSuccessfulParticipations(userId),
      this.prisma.rewardGrant.findMany({
        where: {
          userId,
          kind: { in: ['HOST_MILESTONE', 'PARTICIPATION_MILESTONE'] },
        },
        select: { kind: true, milestoneKey: true },
      }),
      this.prisma.userAttendanceStats.findUnique({ where: { userId } }),
    ]);
    const hostGranted = new Set(
      grants
        .filter((row) => row.kind === 'HOST_MILESTONE')
        .map((row) => Number(row.milestoneKey))
        .filter((value) => Number.isInteger(value)),
    );
    const participationGranted = new Set(
      grants
        .filter((row) => row.kind === 'PARTICIPATION_MILESTONE')
        .map((row) => Number(row.milestoneKey))
        .filter((value) => Number.isInteger(value)),
    );
    const dates = stats
      ? null
      : await this.prisma.dailyAttendanceCheckIn.findMany({
          where: { userId },
          select: { kstDate: true },
        });
    const streak = stats
      ? {
          currentStreak: stats.currentStreak,
          bestStreak: stats.bestStreak,
          totalDays: stats.totalDays,
        }
      : computeAttendanceStreakFromDates(
          (dates ?? []).map((row) => row.kstDate),
          kstDate,
        );
    return {
      checkedInToday: Boolean(checkIn),
      attendanceAmount: policy.attendanceAmount,
      attendanceEnabled: policy.attendanceEnabled && flags.attendanceRewardsEnabled,
      currentStreak: streak.currentStreak,
      bestStreak: streak.bestStreak,
      totalAttendanceDays: streak.totalDays,
      host: this.toTrackProgress({
        currentCount: hostCount,
        enabled: policy.hostEnabled && flags.attendanceRewardsEnabled,
        milestones: milestones.host,
        grantedThresholds: hostGranted,
        fallbackAmount: policy.hostAmount,
      }),
      participation: this.toTrackProgress({
        currentCount: participationCount,
        enabled: policy.participationEnabled && flags.attendanceRewardsEnabled,
        milestones: milestones.participation,
        grantedThresholds: participationGranted,
        fallbackAmount: policy.participationAmount,
      }),
    };
  }

  private toTrackProgress(input: {
    currentCount: number;
    enabled: boolean;
    milestones: RewardMilestoneDto[];
    grantedThresholds: ReadonlySet<number>;
    fallbackAmount: string;
  }): RewardTrackProgressDto {
    const list = milestoneProgressList({
      currentCount: input.currentCount,
      milestones: input.milestones,
      grantedThresholds: input.grantedThresholds,
    });
    const nextOpen = list.find((row) => !row.granted) ?? list[list.length - 1];
    const primary = nextOpen ?? {
      threshold: 1,
      amount: input.fallbackAmount,
      remaining: 1,
      reached: false,
      granted: false,
    };
    const summary = milestoneProgress(input.currentCount, primary.threshold);
    return {
      currentCount: input.currentCount,
      threshold: primary.threshold,
      remaining: summary.remaining,
      reached: summary.reached,
      granted: primary.granted,
      enabled: input.enabled,
      amount: primary.amount,
      milestones: list,
    };
  }

  private async countSuccessfulHostedJoins(userId: string): Promise<number> {
    return this.prisma.join.count({
      where: { hostUserId: userId, status: 'COMPLETED' },
    });
  }

  private async countSuccessfulParticipations(userId: string): Promise<number> {
    return this.prisma.joinParticipant.count({
      where: {
        userId,
        role: 'PARTICIPANT',
        participationStatus: 'COMPLETED',
      },
    });
  }

  private toPolicyDto(row: {
    attendanceEnabled: boolean;
    attendanceAmount: Prisma.Decimal;
    hostEnabled: boolean;
    hostThreshold: number;
    hostAmount: Prisma.Decimal;
    participationEnabled: boolean;
    participationThreshold: number;
    participationAmount: Prisma.Decimal;
    hostMilestones: Prisma.JsonValue;
    participationMilestones: Prisma.JsonValue;
  }): RewardPolicyDto {
    const hostMilestones = normalizeRewardMilestones(row.hostMilestones, [
      { threshold: row.hostThreshold, amount: String(row.hostAmount) },
    ]);
    const participationMilestones = normalizeRewardMilestones(row.participationMilestones, [
      { threshold: row.participationThreshold, amount: String(row.participationAmount) },
    ]);
    const hostPrimary = primaryMilestone(hostMilestones, {
      threshold: row.hostThreshold,
      amount: String(row.hostAmount),
    });
    const participationPrimary = primaryMilestone(participationMilestones, {
      threshold: row.participationThreshold,
      amount: String(row.participationAmount),
    });
    return {
      attendanceEnabled: row.attendanceEnabled,
      attendanceAmount: String(row.attendanceAmount),
      hostEnabled: row.hostEnabled,
      hostThreshold: hostPrimary.threshold,
      hostAmount: hostPrimary.amount,
      participationEnabled: row.participationEnabled,
      participationThreshold: participationPrimary.threshold,
      participationAmount: participationPrimary.amount,
      hostMilestones,
      participationMilestones,
    };
  }

  private mergePolicy(
    current: RewardPolicyDto,
    patch: Partial<RewardPolicyDto>,
  ): RewardPolicyDto {
    const hostMilestones = parseRewardMilestones(
      patch.hostMilestones ?? current.hostMilestones,
    );
    const participationMilestones = parseRewardMilestones(
      patch.participationMilestones ?? current.participationMilestones,
    );
    const hostPrimary = primaryMilestone(hostMilestones, {
      threshold: patch.hostThreshold ?? current.hostThreshold,
      amount: patch.hostAmount ?? current.hostAmount,
    });
    const participationPrimary = primaryMilestone(participationMilestones, {
      threshold: patch.participationThreshold ?? current.participationThreshold,
      amount: patch.participationAmount ?? current.participationAmount,
    });
    return {
      attendanceEnabled: patch.attendanceEnabled ?? current.attendanceEnabled,
      attendanceAmount: patch.attendanceAmount ?? current.attendanceAmount,
      hostEnabled: patch.hostEnabled ?? current.hostEnabled,
      hostThreshold: hostPrimary.threshold,
      hostAmount: hostPrimary.amount,
      participationEnabled: patch.participationEnabled ?? current.participationEnabled,
      participationThreshold: participationPrimary.threshold,
      participationAmount: participationPrimary.amount,
      hostMilestones,
      participationMilestones,
    };
  }

  private toPolicyWrite(policy: RewardPolicyDto) {
    return {
      attendanceEnabled: policy.attendanceEnabled,
      attendanceAmount: policy.attendanceAmount,
      hostEnabled: policy.hostEnabled,
      hostThreshold: policy.hostThreshold,
      hostAmount: policy.hostAmount,
      participationEnabled: policy.participationEnabled,
      participationThreshold: policy.participationThreshold,
      participationAmount: policy.participationAmount,
      hostMilestones: policy.hostMilestones,
      participationMilestones: policy.participationMilestones,
    };
  }

  private isUniqueConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
