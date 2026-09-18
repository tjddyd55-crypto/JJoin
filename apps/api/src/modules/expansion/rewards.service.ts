import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_REWARD_POLICY,
  REWARD_POLICY_SETTINGS_ID,
  attendanceGrantIdempotencyKey,
  attendanceKstDateKey,
  isSuccessfulHostedJoin,
  isSuccessfulParticipationStatus,
  kstDateParts,
  milestoneGrantIdempotencyKey,
  milestoneProgress,
  shouldGrantDailyAttendance,
  shouldGrantMilestone,
  validateRewardPolicy,
} from '@jjoin/domain';
import type {
  AttendanceCheckInDto,
  RewardGrantDto,
  RewardPolicyDto,
  RewardProgressDto,
} from '@jjoin/types';
import { updateRewardPolicySchema } from '@jjoin/validation';
import { CoinIssuanceType } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { CoinLedgerService } from '../wallet/coin-ledger.service';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
    private readonly flags: FeatureFlagsService,
  ) {}

  async getPolicy(): Promise<RewardPolicyDto> {
    const row = await this.prisma.rewardPolicySettings.upsert({
      where: { id: REWARD_POLICY_SETTINGS_ID },
      create: { id: REWARD_POLICY_SETTINGS_ID },
      update: {},
    });
    return {
      attendanceEnabled: row.attendanceEnabled,
      attendanceAmount: String(row.attendanceAmount),
      hostEnabled: row.hostEnabled,
      hostThreshold: row.hostThreshold,
      hostAmount: String(row.hostAmount),
      participationEnabled: row.participationEnabled,
      participationThreshold: row.participationThreshold,
      participationAmount: String(row.participationAmount),
    };
  }

  async updatePolicy(body: unknown, updatedBy?: string): Promise<RewardPolicyDto> {
    const parsed = updateRewardPolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'reward_policy_invalid', issues: parsed.error.issues });
    }
    const current = await this.getPolicy();
    const next = { ...current, ...parsed.data };
    const valid = validateRewardPolicy(next);
    if (!valid.ok) throw new BadRequestException(valid.code);
    await this.prisma.rewardPolicySettings.upsert({
      where: { id: REWARD_POLICY_SETTINGS_ID },
      create: { id: REWARD_POLICY_SETTINGS_ID, ...parsed.data, updatedBy: updatedBy ?? null },
      update: { ...parsed.data, updatedBy: updatedBy ?? null },
    });
    return this.getPolicy();
  }

  async getProgress(userId: string): Promise<RewardProgressDto> {
    await this.evaluateMilestones(userId);
    const flags = await this.flags.getFlags();
    const policy = flags.attendanceRewardsEnabled ? await this.getPolicy() : DEFAULT_REWARD_POLICY;
    const kstDate = attendanceKstDateKey(kstDateParts(new Date()));
    const [checkIn, hostCount, participationCount, hostGrant, participationGrant] = await Promise.all([
      this.prisma.dailyAttendanceCheckIn.findUnique({
        where: { userId_kstDate: { userId, kstDate } },
      }),
      this.countSuccessfulHostedJoins(userId),
      this.countSuccessfulParticipations(userId),
      this.prisma.rewardGrant.findUnique({
        where: {
          userId_kind_milestoneKey: {
            userId,
            kind: 'HOST_MILESTONE',
            milestoneKey: String(policy.hostThreshold),
          },
        },
      }),
      this.prisma.rewardGrant.findUnique({
        where: {
          userId_kind_milestoneKey: {
            userId,
            kind: 'PARTICIPATION_MILESTONE',
            milestoneKey: String(policy.participationThreshold),
          },
        },
      }),
    ]);
    return {
      checkedInToday: Boolean(checkIn),
      attendanceAmount: policy.attendanceAmount,
      attendanceEnabled: policy.attendanceEnabled && flags.attendanceRewardsEnabled,
      host: {
        ...milestoneProgress(hostCount, policy.hostThreshold),
        granted: Boolean(hostGrant),
        enabled: policy.hostEnabled && flags.attendanceRewardsEnabled,
        amount: policy.hostAmount,
      },
      participation: {
        ...milestoneProgress(participationCount, policy.participationThreshold),
        granted: Boolean(participationGrant),
        enabled: policy.participationEnabled && flags.attendanceRewardsEnabled,
        amount: policy.participationAmount,
      },
    };
  }

  async checkIn(userId: string): Promise<AttendanceCheckInDto> {
    const flags = await this.flags.getFlags();
    if (!flags.attendanceRewardsEnabled) {
      throw new BadRequestException('attendance_rewards_disabled');
    }
    const policy = await this.getPolicy();
    const kstDate = attendanceKstDateKey(kstDateParts(new Date()));
    const existing = await this.prisma.dailyAttendanceCheckIn.findUnique({
      where: { userId_kstDate: { userId, kstDate } },
    });
    if (existing || !shouldGrantDailyAttendance({ policy, alreadyCheckedIn: Boolean(existing) })) {
      return {
        kstDate,
        granted: false,
        alreadyCheckedIn: Boolean(existing),
        amount: existing ? String(existing.amount) : '0',
        progress: await this.getProgress(userId),
      };
    }

    const amount = policy.attendanceAmount;
    const idempotencyKey = attendanceGrantIdempotencyKey(userId, kstDate);
    const issuance = policy.attendanceEnabled
      ? await this.ledger.issueCoins({
          userId,
          amount,
          issuanceType: CoinIssuanceType.EVENT_REWARD,
          reason: 'DAILY_ATTENDANCE',
          referenceType: 'DAILY_ATTENDANCE',
          referenceId: kstDate,
          idempotencyKey,
        })
      : null;

    const grant = await this.prisma.rewardGrant.create({
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
    await this.prisma.dailyAttendanceCheckIn.create({
      data: {
        id: randomUUID(),
        userId,
        kstDate,
        amount,
        grantId: grant.id,
      },
    });

    return {
      kstDate,
      granted: true,
      alreadyCheckedIn: false,
      amount,
      progress: await this.getProgress(userId),
    };
  }

  async listHistory(userId: string): Promise<RewardGrantDto[]> {
    const rows = await this.prisma.rewardGrant.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      amount: String(row.amount),
      milestoneKey: row.milestoneKey,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async evaluateMilestones(userId: string): Promise<void> {
    const flags = await this.flags.getFlags();
    if (!flags.attendanceRewardsEnabled) return;
    const policy = await this.getPolicy();
    const [hostCount, participationCount] = await Promise.all([
      this.countSuccessfulHostedJoins(userId),
      this.countSuccessfulParticipations(userId),
    ]);
    await this.maybeGrantMilestone({
      userId,
      kind: 'HOST_MILESTONE',
      enabled: policy.hostEnabled,
      threshold: policy.hostThreshold,
      amount: policy.hostAmount,
      currentCount: hostCount,
    });
    await this.maybeGrantMilestone({
      userId,
      kind: 'PARTICIPATION_MILESTONE',
      enabled: policy.participationEnabled,
      threshold: policy.participationThreshold,
      amount: policy.participationAmount,
      currentCount: participationCount,
    });
  }

  private async maybeGrantMilestone(input: {
    userId: string;
    kind: 'HOST_MILESTONE' | 'PARTICIPATION_MILESTONE';
    enabled: boolean;
    threshold: number;
    amount: string;
    currentCount: number;
  }): Promise<void> {
    const existing = await this.prisma.rewardGrant.findUnique({
      where: {
        userId_kind_milestoneKey: {
          userId: input.userId,
          kind: input.kind,
          milestoneKey: String(input.threshold),
        },
      },
    });
    if (
      !shouldGrantMilestone({
        enabled: input.enabled,
        threshold: input.threshold,
        currentCount: input.currentCount,
        alreadyGranted: Boolean(existing),
      })
    ) {
      return;
    }
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
    } catch {
      // Unique race — payout already recorded.
    }
  }

  private async countSuccessfulHostedJoins(userId: string): Promise<number> {
    const rows = await this.prisma.join.findMany({
      where: { hostUserId: userId },
      select: { status: true },
    });
    return rows.filter((row) => isSuccessfulHostedJoin(row.status)).length;
  }

  private async countSuccessfulParticipations(userId: string): Promise<number> {
    const rows = await this.prisma.joinParticipant.findMany({
      where: { userId, role: 'PARTICIPANT' },
      select: { participationStatus: true },
    });
    return rows.filter((row) => isSuccessfulParticipationStatus(row.participationStatus)).length;
  }
}
