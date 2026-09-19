/**
 * Direct message + message policy contracts (domain + request shapes).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_MESSAGE_POLICY,
  classifyCoinSupplyEffect,
  evaluateConversationAccess,
  evaluateSendMessagePolicy,
  formatCoinTransactionLabelKo,
  normalizeDirectMessageIdempotencyKey,
  orderDirectConversationPair,
} from '@jjoin/domain';
import {
  createDirectConversationSchema,
  postDirectMessageSchema,
  updateMessagePolicySchema,
} from '@jjoin/validation';

test('DEV default messaging policy is free for all', () => {
  assert.equal(DEFAULT_MESSAGE_POLICY.enabled, true);
  assert.equal(DEFAULT_MESSAGE_POLICY.premiumOnly, false);
  assert.equal(DEFAULT_MESSAGE_POLICY.coinCostPerMessage, 0);
  assert.equal(DEFAULT_MESSAGE_POLICY.friendsOnly, false);
  assert.equal(
    evaluateConversationAccess({
      policy: DEFAULT_MESSAGE_POLICY,
      fromUserId: 'a',
      toUserId: 'b',
      isPremiumActive: false,
      isAcceptedFriend: false,
      isBlockedEitherWay: false,
    }).ok,
    true,
  );
});

test('pair uniqueness and send schema', () => {
  assert.deepEqual(orderDirectConversationPair('b', 'a'), orderDirectConversationPair('a', 'b'));
  assert.equal(
    createDirectConversationSchema.safeParse({
      peerUserId: '11111111-1111-4111-8111-111111111111',
    }).success,
    true,
  );
  assert.equal(
    postDirectMessageSchema.safeParse({ body: '안녕', idempotencyKey: 'msg-key-01' }).success,
    true,
  );
  assert.equal(
    normalizeDirectMessageIdempotencyKey('k1', 'u1'),
    'direct-message:u1:k1',
  );
});

test('policy overrides fail closed then restore to default shape', () => {
  assert.equal(
    evaluateSendMessagePolicy({
      policy: { ...DEFAULT_MESSAGE_POLICY, premiumOnly: true },
      fromUserId: 'a',
      toUserId: 'b',
      isPremiumActive: false,
      isAcceptedFriend: false,
      isBlockedEitherWay: false,
      availableBalance: '100',
    }).ok,
    false,
  );
  assert.equal(
    evaluateSendMessagePolicy({
      policy: { ...DEFAULT_MESSAGE_POLICY, friendsOnly: true },
      fromUserId: 'a',
      toUserId: 'b',
      isPremiumActive: false,
      isAcceptedFriend: false,
      isBlockedEitherWay: false,
      availableBalance: '100',
    }).ok,
    false,
  );
  assert.equal(
    evaluateSendMessagePolicy({
      policy: { ...DEFAULT_MESSAGE_POLICY, coinCostPerMessage: 10 },
      fromUserId: 'a',
      toUserId: 'b',
      isPremiumActive: false,
      isAcceptedFriend: false,
      isBlockedEitherWay: false,
      availableBalance: '1',
    }).ok,
    false,
  );
  assert.equal(updateMessagePolicySchema.safeParse(DEFAULT_MESSAGE_POLICY).success, true);
  assert.equal(classifyCoinSupplyEffect('DIRECT_MESSAGE_FEE', 'DEBIT'), 'BURN');
  assert.equal(formatCoinTransactionLabelKo('DIRECT_MESSAGE_FEE'), '메시지 수수료');
});
