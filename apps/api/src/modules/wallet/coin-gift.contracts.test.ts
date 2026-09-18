import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyCoinSupplyEffect,
  coinGiftCreditIdempotencyKey,
  coinGiftDebitIdempotencyKey,
  formatCoinTransactionLabelKo,
  normalizeGiftIdempotencyKey,
  validateCoinGift,
} from '@jjoin/domain';

test('peer gift rejects self, zero, and held-only shortfall', () => {
  assert.equal(
    validateCoinGift({
      fromUserId: 'a',
      toUserId: 'a',
      amount: '1',
      availableBalance: '10',
    }).ok,
    false,
  );
  assert.equal(
    validateCoinGift({
      fromUserId: 'a',
      toUserId: 'b',
      amount: '0',
      availableBalance: '10',
    }).ok,
    false,
  );
  const short = validateCoinGift({
    fromUserId: 'a',
    toUserId: 'b',
    amount: '20',
    availableBalance: '5',
  });
  assert.equal(short.ok, false);
  if (!short.ok) assert.equal(short.code, 'insufficient_available');
});

test('peer gift idempotency keys stay aligned to existing ledger enums', () => {
  const key = normalizeGiftIdempotencyKey('client-1', 'user-a');
  assert.equal(key, 'coin-gift:user-a:client-1');
  assert.equal(coinGiftDebitIdempotencyKey(key), 'coin-gift:coin-gift:user-a:client-1:debit');
  assert.equal(coinGiftCreditIdempotencyKey(key), 'coin-gift:coin-gift:user-a:client-1:credit');
  assert.equal(classifyCoinSupplyEffect('COIN_GIFT', 'CREDIT'), 'TRANSFER');
  assert.equal(formatCoinTransactionLabelKo('COIN_GIFT'), '코인 선물');
});
