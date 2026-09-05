import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DEFAULT_JOIN_CREATION_PRICING_POLICY,
  assertJoinCreationPricingPolicy,
  joinCreatorUserTypeLabelKo,
  resolveEffectiveJoinCreationPolicy,
  resolveJoinCreatorUserType,
  type JoinCreationCostSnapshot,
  type JoinCreationPricingPolicy,
} from '@jjoin/domain';
import type {
  EffectiveJoinCreationPolicyDto,
  JoinCreationPricingPolicyDto,
  JoinCreationPricingPreviewDto,
  MeJoinCoinPolicyDto,
  UpdateJoinCreationPricingPolicyRequest,
} from '@jjoin/types';
import { updateJoinCreationPricingPolicySchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CoinPolicyDisabledError,
  resolveCoinPolicyMode,
} from '../../coin/dev-coin-policy';
import { PremiumService } from '../payments/premium.service';

function benefitLabelKo(
  effective: EffectiveJoinCreationPolicyDto,
): string | null {
  if (effective.effectiveFeeCoinAmount === 0) {
    if (effective.reason === 'OWNER_BENEFIT' || effective.reason === 'OWNER_PREMIUM_BEST') {
      if (effective.owner.eligible && effective.owner.feeCoinAmount === 0) {
        return '업주 혜택 · 조인방 생성 무료';
      }
    }
    if (effective.reason === 'PREMIUM_BENEFIT') {
      return 'Premium 혜택 · 조인방 생성 무료';
    }
    if (effective.base.mode === 'FREE') return null;
    return '조인방 생성 무료';
  }
  if (effective.owner.eligible && effective.effectiveFeeCoinAmount < effective.base.feeCoinAmount) {
    return '업주 혜택 적용';
  }
  if (effective.premium.eligible && effective.effectiveFeeCoinAmount < effective.base.feeCoinAmount) {
    return 'Premium 혜택 적용';
  }
  return null;
}

@Injectable()
export class JoinCreationCoinPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly premium: PremiumService,
  ) {}

  async getAdminPolicy(): Promise<JoinCreationPricingPolicyDto> {
    const row = await this.ensureSettingsRow();
    return this.toDto(row);
  }

  async getAdminPreview(): Promise<JoinCreationPricingPreviewDto> {
    const policy = await this.loadPolicy();
    const general = resolveEffectiveJoinCreationPolicy({
      policy,
      canCreate: true,
      hasActiveStoreOwnership: false,
      isPremiumActive: false,
    });
    const owner = resolveEffectiveJoinCreationPolicy({
      policy,
      canCreate: true,
      hasActiveStoreOwnership: true,
      isPremiumActive: false,
    });
    const premium = resolveEffectiveJoinCreationPolicy({
      policy,
      canCreate: true,
      hasActiveStoreOwnership: false,
      isPremiumActive: true,
    });
    const both = resolveEffectiveJoinCreationPolicy({
      policy,
      canCreate: true,
      hasActiveStoreOwnership: true,
      isPremiumActive: true,
    });
    return {
      general: {
        feeCoinAmount: general.effectiveFeeCoinAmount,
        feeKrw: general.effectiveFeeKrw,
      },
      owner: {
        feeCoinAmount: owner.effectiveFeeCoinAmount,
        feeKrw: owner.effectiveFeeKrw,
        label: owner.effectiveFeeCoinAmount === 0 ? '무료' : `${owner.effectiveFeeCoinAmount} Coin`,
      },
      premium: {
        feeCoinAmount: premium.effectiveFeeCoinAmount,
        feeKrw: premium.effectiveFeeKrw,
        label: premium.effectiveFeeCoinAmount === 0 ? '무료' : `${premium.effectiveFeeCoinAmount} Coin`,
      },
      ownerAndPremium: {
        feeCoinAmount: both.effectiveFeeCoinAmount,
        feeKrw: both.effectiveFeeKrw,
        label: both.effectiveFeeCoinAmount === 0 ? '무료' : `${both.effectiveFeeCoinAmount} Coin`,
      },
    };
  }

  async updateAdminPolicy(
    raw: unknown,
    actorUserId?: string,
  ): Promise<JoinCreationPricingPolicyDto> {
    const parsed = updateJoinCreationPricingPolicySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_join_creation_pricing_policy');
    }
    const normalized = assertJoinCreationPricingPolicy(
      parsed.data as UpdateJoinCreationPricingPolicyRequest,
    );
    const row = await this.prisma.joinCreationCoinPolicySettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...this.policyToDbColumns(normalized),
        pricingUpdatedAt: new Date(),
        pricingUpdatedBy: actorUserId ?? null,
      },
      update: {
        ...this.policyToDbColumns(normalized),
        pricingUpdatedAt: new Date(),
        pricingUpdatedBy: actorUserId ?? null,
      },
    });
    return this.toDto(row);
  }

  async getMyPolicy(userId: string): Promise<MeJoinCoinPolicyDto> {
    this.assertCoinAccountingAvailable();
    const snapshot = await this.resolveCreationCostForUser(userId);
    const effective = await this.resolveEffectivePolicyForUser(userId);
    return {
      userType: snapshot.creatorUserType,
      userTypeLabel: joinCreatorUserTypeLabelKo(snapshot.creatorUserType),
      enabled: snapshot.creationCoinEnabled,
      cost: Number(snapshot.creationCoinCost),
      creationCoinCost: snapshot.creationCoinCost,
      effectivePolicy: effective,
      benefitLabel: benefitLabelKo(effective),
    };
  }

  async resolveEffectivePolicyForUser(userId: string): Promise<EffectiveJoinCreationPolicyDto> {
    const [flags, policy, canCreate] = await Promise.all([
      this.premium.resolveCreatorRoleFlags(userId),
      this.loadPolicy(),
      this.premium.canUserCreateJoin(userId),
    ]);
    const resolved = resolveEffectiveJoinCreationPolicy({
      policy,
      canCreate,
      hasActiveStoreOwnership: flags.hasActiveStoreOwnership,
      isPremiumActive: flags.isPremiumActive,
    });
    return resolved;
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
    const effective = resolveEffectiveJoinCreationPolicy({
      policy,
      canCreate: true,
      hasActiveStoreOwnership: flags.hasActiveStoreOwnership,
      isPremiumActive: flags.isPremiumActive,
    });
    const fee = effective.effectiveFeeCoinAmount;
    return {
      creatorUserType: userType,
      creationCoinEnabled: fee > 0,
      creationCoinCost: String(fee),
    };
  }

  private assertCoinAccountingAvailable(): void {
    if (resolveCoinPolicyMode() !== 'dev') {
      throw new CoinPolicyDisabledError();
    }
  }

  private async loadPolicy(): Promise<JoinCreationPricingPolicy> {
    const row = await this.ensureSettingsRow();
    return this.rowToPolicy(row);
  }

  private policyToDbColumns(policy: JoinCreationPricingPolicy) {
    return {
      baseMode: policy.baseMode,
      baseFeeCoinAmount: policy.baseFeeCoinAmount,
      ownerOverride: policy.ownerOverride,
      ownerFixedFeeCoinAmount: policy.ownerFixedFeeCoinAmount,
      premiumOverride: policy.premiumOverride,
      premiumFixedFeeCoinAmount: policy.premiumFixedFeeCoinAmount,
      // Keep legacy columns in sync for observability
      generalEnabled: policy.baseMode === 'PAID' && policy.baseFeeCoinAmount > 0,
      generalCost: policy.baseFeeCoinAmount,
      storeOwnerEnabled: policy.ownerOverride !== 'FREE' || policy.ownerFixedFeeCoinAmount > 0,
      storeOwnerCost:
        policy.ownerOverride === 'FIXED_FEE' ? policy.ownerFixedFeeCoinAmount : 0,
      premiumEnabled: policy.premiumOverride !== 'INHERIT',
      premiumCost:
        policy.premiumOverride === 'FIXED_FEE' ? policy.premiumFixedFeeCoinAmount : 0,
    };
  }

  private rowToPolicy(row: {
    baseMode: string;
    baseFeeCoinAmount: number;
    ownerOverride: string;
    ownerFixedFeeCoinAmount: number;
    premiumOverride: string;
    premiumFixedFeeCoinAmount: number;
  }): JoinCreationPricingPolicy {
    return assertJoinCreationPricingPolicy({
      baseMode: row.baseMode === 'FREE' ? 'FREE' : 'PAID',
      baseFeeCoinAmount: row.baseFeeCoinAmount,
      ownerOverride: row.ownerOverride as JoinCreationPricingPolicy['ownerOverride'],
      ownerFixedFeeCoinAmount: row.ownerFixedFeeCoinAmount,
      premiumOverride: row.premiumOverride as JoinCreationPricingPolicy['premiumOverride'],
      premiumFixedFeeCoinAmount: row.premiumFixedFeeCoinAmount,
    });
  }

  private async ensureSettingsRow() {
    const defaults = DEFAULT_JOIN_CREATION_PRICING_POLICY;
    return this.prisma.joinCreationCoinPolicySettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...this.policyToDbColumns(defaults),
      },
      update: {},
    });
  }

  private toDto(row: {
    baseMode: string;
    baseFeeCoinAmount: number;
    ownerOverride: string;
    ownerFixedFeeCoinAmount: number;
    premiumOverride: string;
    premiumFixedFeeCoinAmount: number;
  }): JoinCreationPricingPolicyDto {
    const policy = this.rowToPolicy(row);
    return {
      baseMode: policy.baseMode,
      baseFeeCoinAmount: policy.baseFeeCoinAmount,
      ownerOverride: policy.ownerOverride,
      ownerFixedFeeCoinAmount: policy.ownerFixedFeeCoinAmount,
      premiumOverride: policy.premiumOverride,
      premiumFixedFeeCoinAmount: policy.premiumFixedFeeCoinAmount,
    };
  }
}
