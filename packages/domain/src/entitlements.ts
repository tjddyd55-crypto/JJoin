/**
 * Future Premium entitlement keys.
 * PROFILE_MATCH_ALERTS is granted to all today; product can flip requiresPremium later.
 */

export enum EntitlementKey {
  PROFILE_MATCH_ALERTS = 'PROFILE_MATCH_ALERTS',
}

export type EntitlementContext = {
  premiumActive: boolean;
};

const ENTITLEMENT_POLICY: Record<EntitlementKey, { requiresPremium: boolean }> = {
  [EntitlementKey.PROFILE_MATCH_ALERTS]: { requiresPremium: false },
};

export function isEntitlementGranted(
  key: EntitlementKey,
  ctx: EntitlementContext,
): boolean {
  const policy = ENTITLEMENT_POLICY[key];
  if (!policy) return false;
  if (policy.requiresPremium && !ctx.premiumActive) return false;
  return true;
}

export function canUseProfileMatchAlerts(ctx: EntitlementContext): boolean {
  return isEntitlementGranted(EntitlementKey.PROFILE_MATCH_ALERTS, ctx);
}
