import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extendPremiumExpiry,
  premiumRemainingDays,
  exceedsJoinHostLimit,
  canBypassJoinHostLimit,
  maskSecretKey,
} from './premium-membership';

test('extendPremiumExpiry stacks on active membership', () => {
  const now = new Date('2026-09-10T00:00:00+09:00');
  const current = new Date('2026-09-20T00:00:00+09:00');
  const next = extendPremiumExpiry(current, 30, now);
  assert.equal(next.toISOString(), new Date('2026-10-20T00:00:00+09:00').toISOString());
});

test('extendPremiumExpiry starts fresh when expired', () => {
  const now = new Date('2026-09-10T00:00:00+09:00');
  const current = new Date('2026-08-01T00:00:00+09:00');
  const next = extendPremiumExpiry(current, 30, now);
  assert.equal(next.toISOString(), new Date('2026-10-10T00:00:00+09:00').toISOString());
});

test('premiumRemainingDays returns null when inactive', () => {
  assert.equal(
    premiumRemainingDays('2026-01-01T00:00:00Z', new Date('2026-09-01T00:00:00Z')),
    null,
  );
});

test('maskSecretKey masks middle of secret keys', () => {
  const masked = maskSecretKey('test_sk_1234567890abcd');
  assert.notEqual(masked, 'test_sk_1234567890abcd');
  assert.ok(masked.startsWith('test_sk_'));
});

test('join host limit bypass for premium or store owner', () => {
  assert.equal(canBypassJoinHostLimit({ isPremiumActive: true, hasActiveStoreOwnership: false }), true);
  assert.equal(canBypassJoinHostLimit({ isPremiumActive: false, hasActiveStoreOwnership: true }), true);
  assert.equal(canBypassJoinHostLimit({ isPremiumActive: false, hasActiveStoreOwnership: false }), false);
  assert.equal(exceedsJoinHostLimit(1, 1), true);
});
