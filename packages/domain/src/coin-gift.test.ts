import assert from 'node:assert/strict';
import test from 'node:test';
import {
  coinGiftCreditIdempotencyKey,
  coinGiftDebitIdempotencyKey,
  normalizeGiftIdempotencyKey,
  validateCoinGift,
} from './coin-gift';
import { classifyCoinSupplyEffect } from './coin-supply';

test('rejects self-gift, non-positive amount, and held-only shortfall', () => {
  assert.equal(
    validateCoinGift({
      fromUserId: 'u1',
      toUserId: 'u1',
      amount: '10',
      availableBalance: '10',
    }).ok,
    false,
  );
  assert.equal(
    validateCoinGift({
      fromUserId: 'u1',
      toUserId: 'u2',
      amount: '0',
      availableBalance: '10',
    }).ok,
    false,
  );
  const insufficient = validateCoinGift({
    fromUserId: 'u1',
    toUserId: 'u2',
    amount: '30',
    availableBalance: '10',
  });
  assert.equal(insufficient.ok, false);
  if (!insufficient.ok) assert.equal(insufficient.code, 'insufficient_available');
});

test('accepts available-only gift and keeps supply as transfer', () => {
  assert.equal(
    validateCoinGift({
      fromUserId: 'u1',
      toUserId: 'u2',
      amount: '5',
      availableBalance: '5',
    }).ok,
    true,
  );
  assert.equal(classifyCoinSupplyEffect('COIN_GIFT', 'CREDIT'), 'TRANSFER');
  assert.equal(classifyCoinSupplyEffect('COIN_GIFT', 'DEBIT'), 'TRANSFER');
  assert.equal(coinGiftDebitIdempotencyKey('abc'), 'coin-gift:abc:debit');
  assert.equal(coinGiftCreditIdempotencyKey('abc'), 'coin-gift:abc:credit');
  assert.equal(normalizeGiftIdempotencyKey('abc', 'u1'), 'coin-gift:u1:abc');
});
