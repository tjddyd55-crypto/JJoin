import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_MESSAGE_POLICY,
  assertMessagePolicy,
  canOpenMemberMessaging,
  evaluateSendMessagePolicy,
  normalizeMessagePolicy,
} from './message-policy';

const BASE = {
  fromUserId: 'u1',
  toUserId: 'u2',
  isPremiumActive: false,
  isAcceptedFriend: false,
  isBlockedEitherWay: false,
  availableBalance: '0',
};

test('DEV default policy is free and open to all', () => {
  const policy = normalizeMessagePolicy(null);
  assert.deepEqual(policy, DEFAULT_MESSAGE_POLICY);
  assert.equal(policy.enabled, true);
  assert.equal(policy.premiumOnly, false);
  assert.equal(policy.coinCostPerMessage, 0);
  assert.equal(policy.friendsOnly, false);
  assert.equal(canOpenMemberMessaging(policy), true);
  const ok = evaluateSendMessagePolicy({ ...BASE, policy });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.coinCost, 0);
});

test('rejects self-message and disabled / blocked / premium / friends / shortfall', () => {
  assert.equal(
    evaluateSendMessagePolicy({
      ...BASE,
      toUserId: 'u1',
      policy: DEFAULT_MESSAGE_POLICY,
    }).ok,
    false,
  );
  assert.equal(
    evaluateSendMessagePolicy({
      ...BASE,
      policy: { ...DEFAULT_MESSAGE_POLICY, enabled: false },
    }).ok,
    false,
  );
  assert.equal(
    evaluateSendMessagePolicy({
      ...BASE,
      isBlockedEitherWay: true,
      policy: DEFAULT_MESSAGE_POLICY,
    }).ok,
    false,
  );
  const premium = evaluateSendMessagePolicy({
    ...BASE,
    policy: { ...DEFAULT_MESSAGE_POLICY, premiumOnly: true },
  });
  assert.equal(premium.ok, false);
  if (!premium.ok) assert.equal(premium.code, 'premium_required');
  const friends = evaluateSendMessagePolicy({
    ...BASE,
    policy: { ...DEFAULT_MESSAGE_POLICY, friendsOnly: true },
  });
  assert.equal(friends.ok, false);
  if (!friends.ok) assert.equal(friends.code, 'friends_only');
  const paid = evaluateSendMessagePolicy({
    ...BASE,
    availableBalance: '2',
    policy: { ...DEFAULT_MESSAGE_POLICY, coinCostPerMessage: 5 },
  });
  assert.equal(paid.ok, false);
  if (!paid.ok) assert.equal(paid.code, 'insufficient_available');
});

test('allows premium / friends / paid when entitlements and balance hold', () => {
  assert.equal(
    evaluateSendMessagePolicy({
      ...BASE,
      isPremiumActive: true,
      policy: { ...DEFAULT_MESSAGE_POLICY, premiumOnly: true },
    }).ok,
    true,
  );
  assert.equal(
    evaluateSendMessagePolicy({
      ...BASE,
      isAcceptedFriend: true,
      policy: { ...DEFAULT_MESSAGE_POLICY, friendsOnly: true },
    }).ok,
    true,
  );
  const paid = evaluateSendMessagePolicy({
    ...BASE,
    availableBalance: '10',
    policy: { ...DEFAULT_MESSAGE_POLICY, coinCostPerMessage: 5 },
  });
  assert.equal(paid.ok, true);
  if (paid.ok) assert.equal(paid.coinCost, 5);
});

test('assertMessagePolicy rejects fractional or negative coin cost', () => {
  assert.throws(() =>
    assertMessagePolicy({ ...DEFAULT_MESSAGE_POLICY, coinCostPerMessage: -1 }),
  );
  assert.throws(() =>
    assertMessagePolicy({ ...DEFAULT_MESSAGE_POLICY, coinCostPerMessage: 1.5 }),
  );
  assert.deepEqual(assertMessagePolicy({ ...DEFAULT_MESSAGE_POLICY, coinCostPerMessage: 0 }), {
    ...DEFAULT_MESSAGE_POLICY,
    enabled: true,
  });
});
