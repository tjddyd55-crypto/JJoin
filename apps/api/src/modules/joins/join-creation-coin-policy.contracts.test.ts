import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_JOIN_CREATION_COIN_POLICY,
  computeJoinCoinRequirement,
  resolveEffectiveCreationCost,
  resolveJoinCreatorUserType,
} from '@jjoin/domain';
import { updateJoinCreationCoinPolicySchema } from '@jjoin/validation';

test('admin join-coin-policy payload validates', () => {
  const parsed = updateJoinCreationCoinPolicySchema.safeParse({
    general: { enabled: true, cost: 1000 },
    premium: { enabled: false, cost: 0 },
    storeOwner: { enabled: true, cost: 5000 },
  });
  assert.equal(parsed.success, true);
});

test('role resolve + cost matrix for API contract', () => {
  const policy = {
    general: { enabled: true, cost: 1000 },
    premium: { enabled: false, cost: 9999 },
    storeOwner: { enabled: true, cost: 5000 },
  };
  assert.equal(
    resolveJoinCreatorUserType({ hasActiveStoreOwnership: true, isPremiumActive: true }),
    'STORE_OWNER',
  );
  assert.equal(resolveEffectiveCreationCost(policy, 'GENERAL').cost, 1000);
  assert.equal(resolveEffectiveCreationCost(policy, 'PREMIUM').cost, 0);
  assert.equal(resolveEffectiveCreationCost(policy, 'STORE_OWNER').cost, 5000);
});

test('default policy preserves fee=2 until admin changes', () => {
  assert.equal(resolveEffectiveCreationCost(DEFAULT_JOIN_CREATION_COIN_POLICY, 'GENERAL').cost, 2);
});

test('preview total = creation + reward hold', () => {
  const req = computeJoinCoinRequirement({
    plannedPlayerCount: 5,
    rewardPerParticipant: '1000',
    roomCreationFee: '3000',
  });
  assert.equal(req.totalRequiredCoin, '7000');
});
