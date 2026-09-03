import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_JOIN_CREATION_COIN_POLICY,
  assertJoinCreationCoinPolicy,
  resolveEffectiveCreationCost,
  resolveJoinCreatorUserType,
} from './join-creation-coin-policy';
import { computeJoinCoinRequirement } from './coin-join';

test('role priority: store owner beats premium', () => {
  assert.equal(
    resolveJoinCreatorUserType({ hasActiveStoreOwnership: true, isPremiumActive: true }),
    'STORE_OWNER',
  );
  assert.equal(
    resolveJoinCreatorUserType({ hasActiveStoreOwnership: false, isPremiumActive: true }),
    'PREMIUM',
  );
  assert.equal(
    resolveJoinCreatorUserType({ hasActiveStoreOwnership: false, isPremiumActive: false }),
    'GENERAL',
  );
  assert.equal(
    resolveJoinCreatorUserType({ hasActiveStoreOwnership: true, isPremiumActive: false }),
    'STORE_OWNER',
  );
});

test('defaults preserve previous roomCreationFee=2 for all roles', () => {
  for (const type of ['GENERAL', 'PREMIUM', 'STORE_OWNER'] as const) {
    const resolved = resolveEffectiveCreationCost(DEFAULT_JOIN_CREATION_COIN_POLICY, type);
    assert.equal(resolved.enabled, true);
    assert.equal(resolved.cost, 2);
    assert.equal(resolved.costCoinAmount, '2');
  }
});

test('OFF yields effective cost 0 while saved cost can remain', () => {
  const policy = assertJoinCreationCoinPolicy({
    general: { enabled: true, cost: 3000 },
    premium: { enabled: false, cost: 10000 },
    storeOwner: { enabled: true, cost: 5000 },
  });
  assert.equal(resolveEffectiveCreationCost(policy, 'GENERAL').cost, 3000);
  assert.equal(resolveEffectiveCreationCost(policy, 'PREMIUM').cost, 0);
  assert.equal(resolveEffectiveCreationCost(policy, 'PREMIUM').enabled, false);
  assert.equal(policy.premium.cost, 10000);
  assert.equal(resolveEffectiveCreationCost(policy, 'STORE_OWNER').cost, 5000);
});

test('creation cost + reward hold totals (reward slots = P−1)', () => {
  // User-facing example: creation 3000 + reward 1000×4 → plannedPlayerCount=5 (host excluded).
  const general = computeJoinCoinRequirement({
    plannedPlayerCount: 5,
    rewardPerParticipant: '1000',
    roomCreationFee: '3000',
  });
  assert.equal(general.rewardEligibleSlots, 4);
  assert.equal(general.rewardHoldTotal, '4000');
  assert.equal(general.totalRequiredCoin, '7000');

  const premiumFree = computeJoinCoinRequirement({
    plannedPlayerCount: 5,
    rewardPerParticipant: '1000',
    roomCreationFee: '0',
  });
  assert.equal(premiumFree.totalRequiredCoin, '4000');

  const ownerFeeOnly = computeJoinCoinRequirement({
    plannedPlayerCount: 4,
    rewardPerParticipant: '0',
    roomCreationFee: '5000',
  });
  assert.equal(ownerFeeOnly.rewardHoldTotal, '0');
  assert.equal(ownerFeeOnly.totalRequiredCoin, '5000');
});

test('ON + cost 0 is allowed', () => {
  const policy = assertJoinCreationCoinPolicy({
    general: { enabled: true, cost: 0 },
    premium: { enabled: true, cost: 0 },
    storeOwner: { enabled: true, cost: 0 },
  });
  assert.equal(resolveEffectiveCreationCost(policy, 'GENERAL').cost, 0);
  assert.equal(resolveEffectiveCreationCost(policy, 'GENERAL').enabled, true);
});

test('rejects negative creation cost', () => {
  assert.throws(() =>
    assertJoinCreationCoinPolicy({
      general: { enabled: true, cost: -1 },
      premium: { enabled: false, cost: 0 },
      storeOwner: { enabled: true, cost: 0 },
    }),
  );
});

test('rejects non-integer creation cost', () => {
  assert.throws(() =>
    assertJoinCreationCoinPolicy({
      general: { enabled: true, cost: 1.5 },
      premium: { enabled: false, cost: 0 },
      storeOwner: { enabled: true, cost: 0 },
    }),
  );
});
