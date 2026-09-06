import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCoinProductPricing, maskSecretKey, validateVariableCoinPurchaseAmount } from '@jjoin/domain';
import { createPaymentOrderSchema } from '@jjoin/validation';

test('coin amount tampering: client amount field rejected by strict schema', () => {
  const parsed = createPaymentOrderSchema.safeParse({
    productId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 1,
    coinAmount: '10000',
  });
  assert.equal(parsed.success, false);
});

test('variable coin order accepts coinAmount integer', () => {
  const parsed = createPaymentOrderSchema.safeParse({
    productId: '550e8400-e29b-41d4-a716-446655440000',
    coinAmount: 370,
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.coinAmount, 370);
});

test('variable coin purchase validation matrix', () => {
  for (const coin of [10, 20, 100, 370, 500, 1000]) {
    const r = validateVariableCoinPurchaseAmount(coin);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.priceKrw, coin * 100);
  }
  for (const coin of [1, 11, 105, 0, -10]) {
    assert.equal(validateVariableCoinPurchaseAmount(coin).ok, false);
  }
});

test('server ignores client krw: price derived from coin amount only', () => {
  const r = validateVariableCoinPurchaseAmount(100);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.priceKrw, 10000);
    assert.notEqual(r.priceKrw, 1000);
  }
});

test('coin product price must equal coinAmount * 100 KRW', () => {
  assertCoinProductPricing({ coinAmount: 50, priceKrw: 5000 });
  assert.throws(() => assertCoinProductPricing({ coinAmount: 50, priceKrw: 4000 }));
});

test('secret masking never exposes full key', () => {
  const masked = maskSecretKey('live_sk_abcdefghijklmnop');
  assert.notEqual(masked, 'live_sk_abcdefghijklmnop');
  assert.ok(masked.includes('*'));
});
