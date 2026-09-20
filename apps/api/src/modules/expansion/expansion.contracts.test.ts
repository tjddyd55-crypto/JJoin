/**
 * Expansion API contracts — flags, play format, store permission, banner, rewards, gift.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canEditStoreProfile,
  canUseProfileMatchAlerts,
  classifyCoinSupplyEffect,
  DEFAULT_FEATURE_FLAGS,
  formatCoinTransactionLabelKo,
  matchesProfileMatchPreference,
  normalizeFeatureFlags,
  normalizeGiftIdempotencyKey,
  shouldGrantDailyAttendance,
  shouldGrantMilestone,
  validateCoinGift,
  validateJoinPlayFormat,
  validateRewardPolicy,
  DEFAULT_REWARD_POLICY,
} from '@jjoin/domain';
import {
  coinGiftSchema,
  createJoinSchema,
  updateFeatureFlagsSchema,
  updateRewardPolicySchema,
  upsertHomeBannerSchema,
  upsertStoreProfileSchema,
} from '@jjoin/validation';

test('feature flags default hide clubs UI', () => {
  const flags = normalizeFeatureFlags(null);
  assert.equal(flags.clubsUiEnabled, false);
  assert.equal(DEFAULT_FEATURE_FLAGS.clubsUiEnabled, false);
  assert.equal(updateFeatureFlagsSchema.safeParse({ clubsUiEnabled: true }).success, true);
});

test('team format validation is domain-backed not a string hack', () => {
  assert.equal(validateJoinPlayFormat({ playFormat: 'INDIVIDUAL', plannedPlayerCount: 4 }).ok, true);
  assert.equal(validateJoinPlayFormat({ playFormat: 'TEAM', teamSize: 4, teamCount: 2 }).ok, true);
  assert.equal(
    createJoinSchema.safeParse({
      venueId: '11111111-1111-4111-8111-111111111111',
      startAt: '2026-09-20T01:00:00.000Z',
      plannedPlayerCount: 8,
      joinMethod: 'OPEN',
      playFormat: 'TEAM',
      teamSize: 4,
      teamCount: 2,
    }).success,
    true,
  );
});

test('store profile edit requires ACTIVE owner or admin', () => {
  assert.equal(
    canEditStoreProfile({
      ownershipStatus: 'ACTIVE',
      ownerUserId: 'o1',
      actorUserId: 'o1',
      isAdmin: false,
    }),
    true,
  );
  assert.equal(
    canEditStoreProfile({
      ownershipStatus: 'REVOKED',
      ownerUserId: 'o1',
      actorUserId: 'o1',
      isAdmin: false,
    }),
    false,
  );
  assert.equal(
    canEditStoreProfile({
      ownershipStatus: 'PENDING',
      ownerUserId: 'o1',
      actorUserId: 'admin',
      isAdmin: true,
    }),
    true,
  );
  assert.equal(
    upsertStoreProfileSchema.safeParse({
      screenBrand: 'GOLFZON',
      visibility: 'PUBLIC',
    }).success,
    true,
  );
});

test('home banner and reward policy admin schemas', () => {
  assert.equal(
    upsertHomeBannerSchema.safeParse({ title: '가을 조인' }).success,
    true,
  );
  assert.equal(updateRewardPolicySchema.safeParse({ hostThreshold: 0 }).success, false);
  assert.equal(
    updateRewardPolicySchema.safeParse({
      hostMilestones: [
        { threshold: 1, amount: '3' },
        { threshold: 5, amount: '10' },
      ],
    }).success,
    true,
  );
  assert.equal(validateRewardPolicy(DEFAULT_REWARD_POLICY).ok, true);
});

test('profile match entitlement and predicate', () => {
  assert.equal(canUseProfileMatchAlerts({ premiumActive: false }), true);
  assert.equal(
    matchesProfileMatchPreference(
      {
        enabled: true,
        preferredGender: 'ANY',
        minAge: 20,
        maxAge: 40,
        minFieldHandicap: null,
        maxFieldHandicap: null,
        minScreenHandicap: null,
        maxScreenHandicap: null,
        drinkingHabits: [],
        smokingHabits: [],
        sido: null,
        sigungu: null,
      },
      { gender: 'MALE', age: 30, fieldHandicap: 10, screenHandicap: 8, drinking: 'NONE', smoking: 'NONE', sido: '서울특별시', sigungu: '강남구' },
    ),
    true,
  );
});

test('coin gift is transfer-only with distinct debit/credit keys', () => {
  assert.equal(
    validateCoinGift({
      fromUserId: 'u1',
      toUserId: 'u2',
      amount: '3',
      availableBalance: '10',
    }).ok,
    true,
  );
  assert.equal(
    validateCoinGift({
      fromUserId: 'u1',
      toUserId: 'u1',
      amount: '3',
      availableBalance: '10',
    }).ok,
    false,
  );
  assert.equal(classifyCoinSupplyEffect('COIN_GIFT', 'DEBIT'), 'TRANSFER');
  assert.equal(formatCoinTransactionLabelKo('COIN_GIFT'), '코인 선물');
  assert.equal(normalizeGiftIdempotencyKey('abc', 'u1'), 'coin-gift:u1:abc');
  assert.equal(
    coinGiftSchema.safeParse({
      toUserId: '11111111-1111-4111-8111-111111111111',
      amount: '5',
      idempotencyKey: 'gift-key-01',
    }).success,
    true,
  );
});

test('attendance uniqueness and milestone duplicate prevention', () => {
  assert.equal(
    shouldGrantDailyAttendance({ policy: DEFAULT_REWARD_POLICY, alreadyCheckedIn: true }),
    false,
  );
  assert.equal(
    shouldGrantMilestone({
      enabled: true,
      threshold: 5,
      currentCount: 5,
      alreadyGranted: true,
    }),
    false,
  );
});
