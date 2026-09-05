import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCoinTransactionLabelKo,
  matchesWalletTransactionFilter,
} from './coin-transaction-labels';

test('formatCoinTransactionLabelKo maps known ledger types', () => {
  assert.equal(formatCoinTransactionLabelKo('JOIN_REWARD_HOLD'), '조인 생성 HOLD');
  assert.equal(formatCoinTransactionLabelKo('JOIN_REWARD_TRANSFER'), '조인 참가 보상');
  assert.equal(formatCoinTransactionLabelKo('COIN_ISSUANCE'), '코인 충전');
});

test('matchesWalletTransactionFilter HOLD tab', () => {
  assert.equal(
    matchesWalletTransactionFilter('HOLD', {
      direction: 'DEBIT',
      type: 'JOIN_REWARD_HOLD',
    }),
    true,
  );
  assert.equal(
    matchesWalletTransactionFilter('HOLD', {
      direction: 'CREDIT',
      type: 'JOIN_REWARD_TRANSFER',
    }),
    false,
  );
});
