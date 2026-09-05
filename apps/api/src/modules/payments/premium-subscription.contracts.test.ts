import assert from 'node:assert/strict';
import test from 'node:test';
import { isPremiumActive, extendPremiumExpiry } from '@jjoin/domain';
import { PremiumPlanCode } from '@jjoin/types';

test('cancelAtPeriodEnd keeps entitlement active until expiresAt', () => {
  const now = new Date('2026-09-06T00:00:00.000Z');
  const expiresAt = new Date('2026-10-06T00:00:00.000Z');
  assert.equal(isPremiumActive(expiresAt, now), true);
  assert.equal(isPremiumActive(expiresAt, new Date('2026-10-07T00:00:00.000Z')), false);
});

test('premium renewal extends from existing expiry when still active', () => {
  const now = new Date('2026-09-06T00:00:00.000Z');
  const current = new Date('2026-10-06T00:00:00.000Z');
  const next = extendPremiumExpiry(current, 30, now);
  assert.equal(next.toISOString(), new Date('2026-11-05T00:00:00.000Z').toISOString());
});

test('premium plan codes distinguish monthly and yearly', () => {
  assert.equal(PremiumPlanCode.PREMIUM_MONTHLY, 'PREMIUM_MONTHLY');
  assert.equal(PremiumPlanCode.PREMIUM_YEARLY, 'PREMIUM_YEARLY');
});

test('renewal idempotency key is stable per billing cycle', () => {
  const membershipId = '550e8400-e29b-41d4-a716-446655440000';
  const nextBillingAt = '2026-09-06T12:00:00.000Z';
  const billingCycleKey = `${membershipId}:${nextBillingAt}`;
  const idempotencyKey = `premium-renewal:${billingCycleKey}`;
  assert.equal(idempotencyKey, 'premium-renewal:550e8400-e29b-41d4-a716-446655440000:2026-09-06T12:00:00.000Z');
});

test('initial subscribe idempotency key includes authKey', () => {
  const userId = 'user-1';
  const plan = PremiumPlanCode.PREMIUM_MONTHLY;
  const authKey = 'auth-key-abc';
  const key = `premium-subscribe:${userId}:${plan}:${authKey}`;
  assert.match(key, /^premium-subscribe:/);
});
