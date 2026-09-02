import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DEFAULT_JOIN_CREATION_COIN_POLICY,
  assertJoinCreationCoinPolicy,
  joinCreatorUserTypeLabelKo,
  resolveEffectiveCreationCost,
  resolveJoinCreatorUserType,
  type JoinCreationCoinPolicy,
  type JoinCreationCostSnapshot,
} from '@jjoin/domain';
import type {
  JoinCreationCoinPolicyDto,
  MeJoinCoinPolicyDto,
  UpdateJoinCreationCoinPolicyRequest,
} from '@jjoin/types';
import { updateJoinCreationCoinPolicySchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CoinPolicyDisabledError,
  resolveCoinPolicyMode,
} from '../../coin/dev-coin-policy';
import { PremiumService } from '../payments/premium.service';

@Injectable()
export class JoinCreationCoinPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly premium: PremiumService,
  ) {}

  async getAdminPolicy(): Promise<JoinCreationCoinPolicyDto> {
    const row = await this.ensureSettingsRow();
    return this.toDto(row);
  }

  async updateAdminPolicy(raw: unknown): Promise<JoinCreationCoinPolicyDto> {
    const parsed = updateJoinCreationCoinPolicySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_join_creation_coin_policy');
    }
    const normalized = assertJoinCreationCoinPolicy(parsed.data as UpdateJoinCreationCoinPolicyRequest);
    const row = await this.prisma.joinCreationCoinPolicySettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        generalEnabled: normalized.general.enabled,
        generalCost: normalized.general.cost,
        premiumEnabled: normalized.premium.enabled,
        premiumCost: normalized.premium.cost,
        storeOwnerEnabled: normalized.storeOwner.enabled,
        storeOwnerCost: normalized.storeOwner.cost,
      },
      update: {
        generalEnabled: normalized.general.enabled,
        generalCost: normalized.general.cost,
        premiumEnabled: normalized.premium.enabled,
        premiumCost: normalized.premium.cost,
        storeOwnerEnabled: normalized.storeOwner.enabled,
        storeOwnerCost: normalized.storeOwner.cost,
      },
    });
    return this.toDto(row);
  }

  async getMyPolicy(userId: string): Promise<MeJoinCoinPolicyDto> {
    this.assertCoinAccountingAvailable();
    const snapshot = await this.resolveCreationCostForUser(userId);
    return {
      userType: snapshot.creatorUserType,
      userTypeLabel: joinCreatorUserTypeLabelKo(snapshot.creatorUserType),
      enabled: snapshot.creationCoinEnabled,
      cost: Number(snapshot.creationCoinCost),
      creationCoinCost: snapshot.creationCoinCost,
    };
  }

  /**
   * Server SSOT for STANDARD join creation fee.
   * Client-supplied costs are never trusted.
   */
  async resolveCreationCostForUser(userId: string): Promise<JoinCreationCostSnapshot> {
    this.assertCoinAccountingAvailable();
    const [flags, policy] = await Promise.all([
      this.premium.resolveCreatorRoleFlags(userId),
      this.loadPolicy(),
    ]);
    const userType = resolveJoinCreatorUserType(flags);
    const effective = resolveEffectiveCreationCost(policy, userType);
    return {
      creatorUserType: userType,
      creationCoinEnabled: effective.enabled,
      creationCoinCost: effective.costCoinAmount,
    };
  }

  private assertCoinAccountingAvailable(): void {
    if (resolveCoinPolicyMode() !== 'dev') {
      throw new CoinPolicyDisabledError();
    }
  }

  private async loadPolicy(): Promise<JoinCreationCoinPolicy> {
    const row = await this.ensureSettingsRow();
    return {
      general: { enabled: row.generalEnabled, cost: row.generalCost },
      premium: { enabled: row.premiumEnabled, cost: row.premiumCost },
      storeOwner: { enabled: row.storeOwnerEnabled, cost: row.storeOwnerCost },
    };
  }

  private async ensureSettingsRow() {
    return this.prisma.joinCreationCoinPolicySettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        generalEnabled: DEFAULT_JOIN_CREATION_COIN_POLICY.general.enabled,
        generalCost: DEFAULT_JOIN_CREATION_COIN_POLICY.general.cost,
        premiumEnabled: DEFAULT_JOIN_CREATION_COIN_POLICY.premium.enabled,
        premiumCost: DEFAULT_JOIN_CREATION_COIN_POLICY.premium.cost,
        storeOwnerEnabled: DEFAULT_JOIN_CREATION_COIN_POLICY.storeOwner.enabled,
        storeOwnerCost: DEFAULT_JOIN_CREATION_COIN_POLICY.storeOwner.cost,
      },
      update: {},
    });
  }

  private toDto(row: {
    generalEnabled: boolean;
    generalCost: number;
    premiumEnabled: boolean;
    premiumCost: number;
    storeOwnerEnabled: boolean;
    storeOwnerCost: number;
  }): JoinCreationCoinPolicyDto {
    return {
      general: { enabled: row.generalEnabled, cost: row.generalCost },
      premium: { enabled: row.premiumEnabled, cost: row.premiumCost },
      storeOwner: { enabled: row.storeOwnerEnabled, cost: row.storeOwnerCost },
    };
  }
}
