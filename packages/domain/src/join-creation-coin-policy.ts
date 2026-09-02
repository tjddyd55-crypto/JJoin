/**
 * Admin-configurable Join Creation Coin policy by creator user type.
 * Separate from participant reward HOLD — never merge the two concepts.
 */

export const JOIN_CREATOR_USER_TYPES = ['STORE_OWNER', 'PREMIUM', 'GENERAL'] as const;

export type JoinCreatorUserType = (typeof JOIN_CREATOR_USER_TYPES)[number];

export type JoinCreationCoinRolePolicy = {
  enabled: boolean;
  /** Integer coin amount when enabled. Ignored for effective cost when disabled. */
  cost: number;
};

export type JoinCreationCoinPolicy = {
  general: JoinCreationCoinRolePolicy;
  premium: JoinCreationCoinRolePolicy;
  storeOwner: JoinCreationCoinRolePolicy;
};

/**
 * Defaults preserve current DEV STANDARD behavior: fee = 2 for every role.
 * STORE_MATCHING still forces fee 0 on its own path.
 */
export const DEFAULT_JOIN_CREATION_COIN_POLICY: JoinCreationCoinPolicy = {
  general: { enabled: true, cost: 2 },
  premium: { enabled: true, cost: 2 },
  storeOwner: { enabled: true, cost: 2 },
};

export type ResolveJoinCreatorUserTypeInput = {
  hasActiveStoreOwnership: boolean;
  isPremiumActive: boolean;
};

/**
 * Priority SSOT: STORE_OWNER > PREMIUM > GENERAL.
 * Store owner + premium → STORE_OWNER policy.
 */
export function resolveJoinCreatorUserType(
  input: ResolveJoinCreatorUserTypeInput,
): JoinCreatorUserType {
  if (input.hasActiveStoreOwnership) return 'STORE_OWNER';
  if (input.isPremiumActive) return 'PREMIUM';
  return 'GENERAL';
}

export function joinCreatorUserTypeLabelKo(type: JoinCreatorUserType): string {
  switch (type) {
    case 'STORE_OWNER':
      return '업주';
    case 'PREMIUM':
      return '프리미엄 회원';
    case 'GENERAL':
    default:
      return '일반 회원';
  }
}

export function rolePolicyForUserType(
  policy: JoinCreationCoinPolicy,
  userType: JoinCreatorUserType,
): JoinCreationCoinRolePolicy {
  if (userType === 'STORE_OWNER') return policy.storeOwner;
  if (userType === 'PREMIUM') return policy.premium;
  return policy.general;
}

/**
 * Effective creation cost applied at Join create time.
 * OFF → 0 (saved cost may remain for later ON restore).
 */
export function resolveEffectiveCreationCost(
  policy: JoinCreationCoinPolicy,
  userType: JoinCreatorUserType,
): { enabled: boolean; cost: number; costCoinAmount: string } {
  const role = rolePolicyForUserType(policy, userType);
  const enabled = Boolean(role.enabled);
  const rawCost = normalizeCreationCostInteger(role.cost);
  const cost = enabled ? rawCost : 0;
  return {
    enabled,
    cost,
    costCoinAmount: String(cost),
  };
}

export function normalizeCreationCostInteger(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error('invalid_join_creation_cost');
  }
  // Guard absurd values — admin UI should also clamp.
  if (n > 1_000_000_000) {
    throw new Error('invalid_join_creation_cost');
  }
  return n;
}

export function assertJoinCreationCoinPolicy(
  policy: JoinCreationCoinPolicy,
): JoinCreationCoinPolicy {
  return {
    general: {
      enabled: Boolean(policy.general.enabled),
      cost: normalizeCreationCostInteger(policy.general.cost),
    },
    premium: {
      enabled: Boolean(policy.premium.enabled),
      cost: normalizeCreationCostInteger(policy.premium.cost),
    },
    storeOwner: {
      enabled: Boolean(policy.storeOwner.enabled),
      cost: normalizeCreationCostInteger(policy.storeOwner.cost),
    },
  };
}

export type JoinCreationCostSnapshot = {
  creatorUserType: JoinCreatorUserType;
  creationCoinEnabled: boolean;
  creationCoinCost: string;
};
