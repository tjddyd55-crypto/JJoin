/**
 * Wallet API contracts — labels and pending payout semantics.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCoinTransactionLabelKo, zeroCoinAmount } from '@jjoin/domain';

test('wallet transaction Korean labels cover ledger types', () => {
  assert.equal(formatCoinTransactionLabelKo('JOIN_REWARD_HOLD'), '조인 생성 HOLD');
  assert.equal(formatCoinTransactionLabelKo('COIN_ISSUANCE'), '코인 충전');
});

test('pending payout zero baseline', () => {
  assert.equal(zeroCoinAmount(), '0');
});
