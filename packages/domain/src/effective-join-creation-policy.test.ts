import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_JOIN_CREATION_PRICING_POLICY,
  resolveEffectiveJoinCreationPolicy,
} from './effective-join-creation-policy';

const paid30: typeof DEFAULT_JOIN_CREATION_PRICING_POLICY = {
  baseMode: 'PAID',
  baseFeeCoinAmount: 30,
  ownerOverride: 'INHERIT',
  ownerFixedFeeCoinAmount: 0,
  premiumOverride: 'INHERIT',
  premiumFixedFeeCoinAmount: 0,
};

function resolve(
  policy: typeof paid30,
  flags: { owner?: boolean; premium?: boolean; canCreate?: boolean },
) {
  return resolveEffectiveJoinCreationPolicy({
    policy,
    canCreate: flags.canCreate ?? true,
    hasActiveStoreOwnership: flags.owner ?? false,
    isPremiumActive: flags.premium ?? false,
  });
}

test('CASE 1: Base PAID 30 general user → 30 Coin', () => {
  const r = resolve(paid30, {});
  assert.equal(r.effectiveFeeCoinAmount, 30);
  assert.equal(r.effectiveFeeKrw, 3000);
});

test('CASE 2: Base PAID 30 Owner FREE → 0', () => {
  const r = resolve({ ...paid30, ownerOverride: 'FREE' }, { owner: true });
  assert.equal(r.effectiveFeeCoinAmount, 0);
  assert.equal(r.reason, 'OWNER_BENEFIT');
});

test('CASE 3: Base PAID 30 Owner FIXED 10 → 10', () => {
  const r = resolve(
    { ...paid30, ownerOverride: 'FIXED_FEE', ownerFixedFeeCoinAmount: 10 },
    { owner: true },
  );
  assert.equal(r.effectiveFeeCoinAmount, 10);
});

test('CASE 4: Base PAID 30 Premium FREE → 0', () => {
  const r = resolve({ ...paid30, premiumOverride: 'FREE' }, { premium: true });
  assert.equal(r.effectiveFeeCoinAmount, 0);
});

test('CASE 5: Base PAID 30 Premium FIXED 10 → 10', () => {
  const r = resolve(
    { ...paid30, premiumOverride: 'FIXED_FEE', premiumFixedFeeCoinAmount: 10 },
    { premium: true },
  );
  assert.equal(r.effectiveFeeCoinAmount, 10);
});

test('CASE 6: Owner 10 Premium FREE → 0', () => {
  const r = resolve(
    {
      ...paid30,
      ownerOverride: 'FIXED_FEE',
      ownerFixedFeeCoinAmount: 10,
      premiumOverride: 'FREE',
    },
    { owner: true, premium: true },
  );
  assert.equal(r.effectiveFeeCoinAmount, 0);
});

test('CASE 7: Owner 20 Premium 10 → 10', () => {
  const r = resolve(
    {
      ...paid30,
      ownerOverride: 'FIXED_FEE',
      ownerFixedFeeCoinAmount: 20,
      premiumOverride: 'FIXED_FEE',
      premiumFixedFeeCoinAmount: 10,
    },
    { owner: true, premium: true },
  );
  assert.equal(r.effectiveFeeCoinAmount, 10);
});

test('CASE 8: Base FREE Owner INHERIT → 0', () => {
  const r = resolve(
    { ...paid30, baseMode: 'FREE', baseFeeCoinAmount: 0, ownerOverride: 'INHERIT' },
    { owner: true },
  );
  assert.equal(r.effectiveFeeCoinAmount, 0);
});

test('CASE 9: no permission → canCreate false (fee still computed)', () => {
  const r = resolve(paid30, { canCreate: false });
  assert.equal(r.canCreate, false);
  assert.equal(r.effectiveFeeCoinAmount, 30);
});

test('owner FIXED 10 with base FREE → 10 (not min with base)', () => {
  const r = resolve(
    {
      ...paid30,
      baseMode: 'FREE',
      baseFeeCoinAmount: 0,
      ownerOverride: 'FIXED_FEE',
      ownerFixedFeeCoinAmount: 10,
    },
    { owner: true },
  );
  assert.equal(r.effectiveFeeCoinAmount, 10);
});

test('default policy: owner FREE', () => {
  const r = resolve(DEFAULT_JOIN_CREATION_PRICING_POLICY, { owner: true });
  assert.equal(r.effectiveFeeCoinAmount, 0);
});
