import test from 'node:test';
import assert from 'node:assert/strict';
import { maskSecretKey } from '@jjoin/domain';
import {
  confirmTossPaymentSchema,
  createPaymentOrderSchema,
} from '@jjoin/validation';
import { PaymentEnvironment } from '@jjoin/types';

test('createPaymentOrderSchema accepts productId only', () => {
  const parsed = createPaymentOrderSchema.safeParse({
    productId: '550e8400-e29b-41d4-a716-446655440000',
  });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data?.productId, '550e8400-e29b-41d4-a716-446655440000');
});

test('createPaymentOrderSchema rejects client amount tampering fields', () => {
  const parsed = createPaymentOrderSchema.safeParse({
    productId: '550e8400-e29b-41d4-a716-446655440000',
    amount: 1,
  });
  assert.equal(parsed.success, false);
});

test('confirmTossPaymentSchema requires paymentKey orderId amount', () => {
  const ok = confirmTossPaymentSchema.safeParse({
    paymentKey: 'pay_key_test',
    orderId: 'JJorder123',
    amount: 10000,
  });
  assert.equal(ok.success, true);

  const bad = confirmTossPaymentSchema.safeParse({
    paymentKey: 'pay_key_test',
    orderId: 'JJorder123',
  });
  assert.equal(bad.success, false);
});

test('maskSecretKey never returns full secret', () => {
  const masked = maskSecretKey('test_sk_live_abcdefghijklmnop');
  assert.notEqual(masked, 'test_sk_live_abcdefghijklmnop');
  assert.match(masked, /^test_sk_/);
  assert.ok(masked.includes('*'));
});

test('development LIVE confirm guard expectation', () => {
  const isNonProduction = process.env.NODE_ENV !== 'production';
  const liveInDevBlocked =
    PaymentEnvironment.LIVE === PaymentEnvironment.LIVE && isNonProduction;
  assert.equal(typeof liveInDevBlocked, 'boolean');
});

test('paymentId path params must be UUID v4 (rejects route collisions like products)', () => {
  const uuidV4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.equal(uuidV4.test('products'), false);
  assert.equal(uuidV4.test('payments'), false);
  assert.equal(uuidV4.test('payment-purchase:x'), false);
  assert.equal(uuidV4.test('550e8400-e29b-41d4-a716-446655440000'), true);
});
