import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCoinProductPricing,
  expectedCoinProductPriceKrw,
  resolveEffectiveJoinCreationPolicy,
} from '@jjoin/domain';
import { updateJoinCreationPricingPolicySchema } from '@jjoin/validation';

test('admin join pricing policy payload validates', () => {
  const parsed = updateJoinCreationPricingPolicySchema.safeParse({
    baseMode: 'PAID',
    baseFeeCoinAmount: 30,
    ownerOverride: 'FREE',
    ownerFixedFeeCoinAmount: 0,
    premiumOverride: 'FIXED_FEE',
    premiumFixedFeeCoinAmount: 10,
  });
  assert.equal(parsed.success, true);
});

test('coin product tampering blocked by domain invariant', () => {
  assert.throws(() => assertCoinProductPricing({ coinAmount: 10, priceKrw: 100 }));
  assert.equal(expectedCoinProductPriceKrw(10), 1000);
});

test('join pricing matrix owner + premium best price', () => {
  const policy = {
    baseMode: 'PAID' as const,
    baseFeeCoinAmount: 30,
    ownerOverride: 'FIXED_FEE' as const,
    ownerFixedFeeCoinAmount: 20,
    premiumOverride: 'FIXED_FEE' as const,
    premiumFixedFeeCoinAmount: 10,
  };
  const both = resolveEffectiveJoinCreationPolicy({
    policy,
    canCreate: true,
    hasActiveStoreOwnership: true,
    isPremiumActive: true,
  });
  assert.equal(both.effectiveFeeCoinAmount, 10);
});
