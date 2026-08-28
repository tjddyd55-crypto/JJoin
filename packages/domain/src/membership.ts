/**
 * Membership / Subscription / Entitlement resolution SSOT.
 *
 * FREE = no Premium subscription (or period ended). No Subscription row required.
 * PREMIUM benefit = ROOM_CREATION_FEE_WAIVER only — never coin mint / free reward.
 *
 * Do not scatter `if (plan === 'PREMIUM')` across features — use hasEntitlement().
 */

export const MEMBERSHIP_PLAN_FREE = 'FREE' as const;
export const MEMBERSHIP_PLAN_PREMIUM = 'PREMIUM' as const;

export type MembershipPlanCode = typeof MEMBERSHIP_PLAN_FREE | typeof MEMBERSHIP_PLAN_PREMIUM;

export const ENTITLEMENT_ROOM_CREATION_FEE_WAIVER = 'ROOM_CREATION_FEE_WAIVER' as const;

export type EntitlementCode = typeof ENTITLEMENT_ROOM_CREATION_FEE_WAIVER | (string & {});

export type SubscriptionStatusCode =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'PAST_DUE'
  | 'PENDING';

/**
 * Snapshot loaded from DB for resolution. Domain does not talk to Prisma.
 */
export type SubscriptionResolutionInput = {
  id: string;
  planCode: string;
  status: SubscriptionStatusCode;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  /** Plan entitlement codes at resolution time (from MembershipPlanEntitlement). */
  planEntitlements: readonly string[];
};

export type ResolvedMembership = {
  effectivePlanCode: MembershipPlanCode;
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatusCode | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  entitlements: string[];
  hasRoomCreationFeeWaiver: boolean;
};

function freeMembership(): ResolvedMembership {
  return {
    effectivePlanCode: MEMBERSHIP_PLAN_FREE,
    subscriptionId: null,
    subscriptionStatus: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    entitlements: [],
    hasRoomCreationFeeWaiver: false,
  };
}

/**
 * Period still covers `at` (exclusive end: at < periodEnd).
 */
export function isSubscriptionPeriodActive(
  currentPeriodEnd: Date,
  at: Date = new Date(),
): boolean {
  return at.getTime() < currentPeriodEnd.getTime();
}

/**
 * Statuses that may still grant entitlements while period is active.
 * PENDING never grants. EXPIRED never grants (period should already be over).
 *
 * PAST_DUE: default keep benefits until currentPeriodEnd (billing Phase may revisit).
 */
function statusAllowsEntitlementWhileInPeriod(status: SubscriptionStatusCode): boolean {
  return status === 'ACTIVE' || status === 'CANCELLED' || status === 'PAST_DUE';
}

/**
 * Resolve effective membership from the best Premium subscription candidate (or null).
 * Caller selects the relevant subscription row(s); this function is pure time+status logic.
 */
export function resolveMembershipFromSubscription(
  subscription: SubscriptionResolutionInput | null,
  at: Date = new Date(),
): ResolvedMembership {
  if (!subscription) {
    return freeMembership();
  }

  if (subscription.planCode !== MEMBERSHIP_PLAN_PREMIUM) {
    return freeMembership();
  }

  if (!statusAllowsEntitlementWhileInPeriod(subscription.status)) {
    return {
      ...freeMembership(),
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  if (!isSubscriptionPeriodActive(subscription.currentPeriodEnd, at)) {
    return {
      ...freeMembership(),
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status === 'CANCELLED' ? 'CANCELLED' : 'EXPIRED',
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  const entitlements = [...new Set(subscription.planEntitlements)];
  const hasRoomCreationFeeWaiver = entitlements.includes(ENTITLEMENT_ROOM_CREATION_FEE_WAIVER);

  return {
    effectivePlanCode: MEMBERSHIP_PLAN_PREMIUM,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    entitlements,
    hasRoomCreationFeeWaiver,
  };
}

/**
 * Among candidates, pick the one that yields Premium if any; otherwise the latest period-end.
 */
export function pickSubscriptionForResolution(
  candidates: readonly SubscriptionResolutionInput[],
  at: Date = new Date(),
): SubscriptionResolutionInput | null {
  if (candidates.length === 0) return null;

  const premiumActive = candidates.filter((c) => {
    const resolved = resolveMembershipFromSubscription(c, at);
    return resolved.effectivePlanCode === MEMBERSHIP_PLAN_PREMIUM;
  });

  if (premiumActive.length > 0) {
    return [...premiumActive].sort(
      (a, b) => b.currentPeriodEnd.getTime() - a.currentPeriodEnd.getTime(),
    )[0];
  }

  return [...candidates].sort(
    (a, b) => b.currentPeriodEnd.getTime() - a.currentPeriodEnd.getTime(),
  )[0];
}

export function hasEntitlement(
  membership: ResolvedMembership,
  code: EntitlementCode,
): boolean {
  return membership.entitlements.includes(code);
}

/**
 * Apply waiver to policy fee. Reward amounts are never touched here.
 */
export function resolveEffectiveRoomCreationFee(params: {
  policyRoomCreationFee: string;
  membership: ResolvedMembership;
}): string {
  if (hasEntitlement(params.membership, ENTITLEMENT_ROOM_CREATION_FEE_WAIVER)) {
    return '0';
  }
  return params.policyRoomCreationFee;
}

export type JoinMembershipSnapshot = {
  effectivePlanCode: MembershipPlanCode;
  roomCreationFeeWaived: boolean;
  entitlementCodes: string[];
  subscriptionId: string | null;
  resolvedAt: string;
};

export function buildJoinMembershipSnapshot(
  membership: ResolvedMembership,
  at: Date = new Date(),
): JoinMembershipSnapshot {
  return {
    effectivePlanCode: membership.effectivePlanCode,
    roomCreationFeeWaived: membership.hasRoomCreationFeeWaiver,
    entitlementCodes: [...membership.entitlements],
    subscriptionId: membership.subscriptionId,
    resolvedAt: at.toISOString(),
  };
}

/** JoinOption.optionKey for immutable create-time membership audit. */
export const JOIN_OPTION_MEMBERSHIP_SNAPSHOT = 'membership_snapshot';
