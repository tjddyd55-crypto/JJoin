import assert from 'node:assert/strict';
import test from 'node:test';
import { EntitlementKey, canUseProfileMatchAlerts, isEntitlementGranted } from './entitlements';

test('profile match alerts are granted without premium today', () => {
  assert.equal(canUseProfileMatchAlerts({ premiumActive: false }), true);
  assert.equal(canUseProfileMatchAlerts({ premiumActive: true }), true);
  assert.equal(
    isEntitlementGranted(EntitlementKey.PROFILE_MATCH_ALERTS, { premiumActive: false }),
    true,
  );
});
