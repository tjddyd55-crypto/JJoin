import assert from 'node:assert/strict';
import test from 'node:test';
import { canUseProfileMatchAlerts, EntitlementKey, isEntitlementGranted } from './entitlements';
import {
  DEFAULT_FEATURE_FLAGS,
  isClubDeepLinkAvailable,
  isClubsUiEnabled,
  normalizeFeatureFlags,
} from './feature-flags';

test('clubs UI is hidden by default and deep links follow the flag', () => {
  const flags = normalizeFeatureFlags(null);
  assert.equal(flags.clubsUiEnabled, false);
  assert.equal(isClubsUiEnabled(flags), false);
  assert.equal(isClubDeepLinkAvailable(flags), false);
  assert.equal(isClubsUiEnabled({ ...DEFAULT_FEATURE_FLAGS, clubsUiEnabled: true }), true);
});

test('profile match entitlement key exists and is granted without premium today', () => {
  assert.equal(EntitlementKey.PROFILE_MATCH_ALERTS, 'PROFILE_MATCH_ALERTS');
  assert.equal(isEntitlementGranted(EntitlementKey.PROFILE_MATCH_ALERTS, { premiumActive: false }), true);
  assert.equal(canUseProfileMatchAlerts({ premiumActive: false }), true);
});
