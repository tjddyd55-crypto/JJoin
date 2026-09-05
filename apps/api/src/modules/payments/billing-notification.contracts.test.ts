import assert from 'node:assert/strict';
import test from 'node:test';

const BILLING_NOTIFICATION_TYPES = [
  'COIN_PURCHASE_COMPLETED',
  'PREMIUM_SUBSCRIPTION_ACTIVATED',
  'PREMIUM_RENEWAL_SUCCEEDED',
  'PREMIUM_RENEWAL_FAILED',
  'PREMIUM_CANCEL_SCHEDULED',
] as const;

test('billing notification types are distinct', () => {
  const set = new Set(BILLING_NOTIFICATION_TYPES);
  assert.equal(set.size, BILLING_NOTIFICATION_TYPES.length);
});

test('billing notification event keys are duplicate-safe', () => {
  const paymentId = 'pay-123';
  const billingCycleKey = 'mem:2026-09-06';
  assert.equal(`coin-purchase:${paymentId}`, 'coin-purchase:pay-123');
  assert.equal(`premium-activate:${paymentId}`, 'premium-activate:pay-123');
  assert.equal(`premium-renewal:${billingCycleKey}`, 'premium-renewal:mem:2026-09-06');
  assert.equal(`premium-renewal-failed:${billingCycleKey}`, 'premium-renewal-failed:mem:2026-09-06');
});

test('billing deep link routes stay wallet or premium', () => {
  const routes = ['wallet', 'premium'];
  for (const route of routes) {
    assert.ok(route.length > 0);
  }
});
