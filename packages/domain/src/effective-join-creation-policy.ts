/**
 * Join Creation Pricing SSOT — base platform policy + Owner/Premium benefit overrides.
 * Permission (canCreateJoin) is separate; this module resolves fee only.
 */

import { coinToKrw } from './coin-krw';

export type JoinCreationBaseMode = 'FREE' | 'PAID';
export type JoinCreationBenefitOverrideMode = 'INHERIT' | 'FREE' | 'FIXED_FEE';

export type JoinCreationPricingPolicy = {
  baseMode: JoinCreationBaseMode;
  /** Integer coins when baseMode=PAID. Ignored when FREE. */
  baseFeeCoinAmount: number;
  ownerOverride: JoinCreationBenefitOverrideMode;
  /** Required when ownerOverride=FIXED_FEE */
  ownerFixedFeeCoinAmount: number;
  premiumOverride: JoinCreationBenefitOverrideMode;
  /** Required when premiumOverride=FIXED_FEE */
  premiumFixedFeeCoinAmount: number;
};

export type EffectiveJoinCreationPolicyReason =
  | 'BASE_FREE'
  | 'BASE_PAID'
  | 'OWNER_BENEFIT'
  | 'PREMIUM_BENEFIT'
  | 'OWNER_PREMIUM_BEST';

export type EffectiveJoinCreationPolicy = {
  canCreate: boolean;
  base: {
    mode: JoinCreationBaseMode;
    feeCoinAmount: number;
  };
  owner: {
    eligible: boolean;
    mode: JoinCreationBenefitOverrideMode | null;
    feeCoinAmount: number | null;
  };
  premium: {
    eligible: boolean;
    mode: JoinCreationBenefitOverrideMode | null;
    feeCoinAmount: number | null;
  };
  effectiveFeeCoinAmount: number;
  effectiveFeeKrw: number;
  reason: EffectiveJoinCreationPolicyReason;
};

export const DEFAULT_JOIN_CREATION_PRICING_POLICY: JoinCreationPricingPolicy = {
  baseMode: 'PAID',
  baseFeeCoinAmount: 30,
  ownerOverride: 'FREE',
  ownerFixedFeeCoinAmount: 0,
  premiumOverride: 'INHERIT',
  premiumFixedFeeCoinAmount: 0,
};

export function normalizeFeeCoinAmount(value: unknown, field: string): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error(`invalid_${field}`);
  }
  if (n > 1_000_000_000) {
    throw new Error(`invalid_${field}`);
  }
  return n;
}

export function assertJoinCreationPricingPolicy(
  raw: JoinCreationPricingPolicy,
): JoinCreationPricingPolicy {
  const baseFeeCoinAmount = normalizeFeeCoinAmount(raw.baseFeeCoinAmount, 'base_fee');
  const ownerFixedFeeCoinAmount = normalizeFeeCoinAmount(
    raw.ownerFixedFeeCoinAmount,
    'owner_fixed_fee',
  );
  const premiumFixedFeeCoinAmount = normalizeFeeCoinAmount(
    raw.premiumFixedFeeCoinAmount,
    'premium_fixed_fee',
  );

  if (raw.ownerOverride === 'FIXED_FEE' && ownerFixedFeeCoinAmount <= 0) {
    throw new Error('owner_fixed_fee_must_be_positive');
  }
  if (raw.premiumOverride === 'FIXED_FEE' && premiumFixedFeeCoinAmount <= 0) {
    throw new Error('premium_fixed_fee_must_be_positive');
  }

  return {
    baseMode: raw.baseMode === 'FREE' ? 'FREE' : 'PAID',
    baseFeeCoinAmount,
    ownerOverride: raw.ownerOverride,
    ownerFixedFeeCoinAmount,
    premiumOverride: raw.premiumOverride,
    premiumFixedFeeCoinAmount,
  };
}

function resolveBaseFee(policy: JoinCreationPricingPolicy): number {
  if (policy.baseMode === 'FREE') return 0;
  return policy.baseFeeCoinAmount;
}

function resolveOverrideFee(
  mode: JoinCreationBenefitOverrideMode,
  fixedFee: number,
  baseFee: number,
): number {
  if (mode === 'INHERIT') return baseFee;
  if (mode === 'FREE') return 0;
  return fixedFee;
}

export type ResolveEffectiveJoinCreationPolicyInput = {
  policy: JoinCreationPricingPolicy;
  canCreate: boolean;
  hasActiveStoreOwnership: boolean;
  isPremiumActive: boolean;
};

/**
 * Resolves the most favorable creation fee for the user.
 * Owner + Premium: min(ownerResolved, premiumResolved).
 * Single benefit tier: that tier's resolved fee.
 * Neither: base fee only.
 */
export function resolveEffectiveJoinCreationPolicy(
  input: ResolveEffectiveJoinCreationPolicyInput,
): EffectiveJoinCreationPolicy {
  const policy = assertJoinCreationPricingPolicy(input.policy);
  const baseFee = resolveBaseFee(policy);
  const ownerEligible = input.hasActiveStoreOwnership;
  const premiumEligible = input.isPremiumActive;

  const ownerFee = ownerEligible
    ? resolveOverrideFee(policy.ownerOverride, policy.ownerFixedFeeCoinAmount, baseFee)
    : null;
  const premiumFee = premiumEligible
    ? resolveOverrideFee(policy.premiumOverride, policy.premiumFixedFeeCoinAmount, baseFee)
    : null;

  let effectiveFee = baseFee;
  let reason: EffectiveJoinCreationPolicyReason = baseFee === 0 ? 'BASE_FREE' : 'BASE_PAID';

  if (ownerEligible && premiumEligible) {
    const ownerResolved = ownerFee!;
    const premiumResolved = premiumFee!;
    effectiveFee = Math.min(ownerResolved, premiumResolved);
    reason = 'OWNER_PREMIUM_BEST';
    if (effectiveFee === premiumResolved && premiumResolved <= ownerResolved) {
      reason = 'PREMIUM_BENEFIT';
    } else if (effectiveFee === ownerResolved) {
      reason = 'OWNER_BENEFIT';
    }
  } else if (ownerEligible) {
    effectiveFee = ownerFee!;
    reason = effectiveFee === 0 ? 'OWNER_BENEFIT' : 'OWNER_BENEFIT';
  } else if (premiumEligible) {
    effectiveFee = premiumFee!;
    reason = 'PREMIUM_BENEFIT';
  }

  return {
    canCreate: input.canCreate,
    base: {
      mode: policy.baseMode,
      feeCoinAmount: baseFee,
    },
    owner: {
      eligible: ownerEligible,
      mode: ownerEligible ? policy.ownerOverride : null,
      feeCoinAmount: ownerFee,
    },
    premium: {
      eligible: premiumEligible,
      mode: premiumEligible ? policy.premiumOverride : null,
      feeCoinAmount: premiumFee,
    },
    effectiveFeeCoinAmount: effectiveFee,
    effectiveFeeKrw: coinToKrw(effectiveFee),
    reason,
  };
}

/**
 * Maps legacy per-role policy rows to the new pricing policy shape.
 */
export function migrateLegacyJoinCreationPolicy(input: {
  generalEnabled: boolean;
  generalCost: number;
  premiumEnabled: boolean;
  premiumCost: number;
  storeOwnerEnabled: boolean;
  storeOwnerCost: number;
}): JoinCreationPricingPolicy {
  const baseMode: JoinCreationBaseMode =
    input.generalEnabled && input.generalCost > 0 ? 'PAID' : 'FREE';
  const baseFeeCoinAmount = input.generalEnabled ? input.generalCost : 0;

  const ownerOverride: JoinCreationBenefitOverrideMode =
    !input.storeOwnerEnabled || input.storeOwnerCost === 0
      ? 'FREE'
      : 'FIXED_FEE';
  const ownerFixedFeeCoinAmount =
    ownerOverride === 'FIXED_FEE' ? input.storeOwnerCost : 0;

  const premiumOverride: JoinCreationBenefitOverrideMode =
    !input.premiumEnabled
      ? 'INHERIT'
      : input.premiumCost === 0
        ? 'FREE'
        : 'FIXED_FEE';
  const premiumFixedFeeCoinAmount =
    premiumOverride === 'FIXED_FEE' ? input.premiumCost : 0;

  return assertJoinCreationPricingPolicy({
    baseMode,
    baseFeeCoinAmount,
    ownerOverride,
    ownerFixedFeeCoinAmount,
    premiumOverride,
    premiumFixedFeeCoinAmount,
  });
}
