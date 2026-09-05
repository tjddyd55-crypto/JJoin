import assert from 'node:assert/strict';
import test from 'node:test';
import { assertCoinProductPricing, maskSecretKey } from '@jjoin/domain';
import { createPaymentOrderSchema } from '@jjoin/validation';

test('coin amount tampering: server uses product catalog only', () => {
  const parsed = createPaymentOrderSchema.safeParse({
    productId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 1,
    coinAmount: '10000',
  });
  assert.equal(parsed.success, false);
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
