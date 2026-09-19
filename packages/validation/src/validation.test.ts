import test from 'node:test';
import assert from 'node:assert/strict';
import {
  coinGiftSchema,
  applyJoinSchema,
  createJoinSchema,
  hostJoinRecurringTemplateSchema,
  createStoreBannerAdSchema,
  createStoreMatchingJoinSchema,
  firstZodIssueCode,
  profileEditSchema,
  profileMatchPreferenceSchema,
  profileSetupSchema,
  reviewStoreBannerAdSchema,
  scheduleStoreBannerAdSchema,
  termsConsentSchema,
  createDirectConversationSchema,
  postDirectMessageSchema,
  updateFeatureFlagsSchema,
  updateMessagePolicySchema,
  updateRewardPolicySchema,
  upsertHomeBannerSchema,
  upsertStoreProfileSchema,
} from './index';

test('profile setup requires nickname and region', () => {
  const bad = profileSetupSchema.safeParse({
    nickname: 'a',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    regionLabel: '',
    skillLevel: 'BEGINNER',
  });
  assert.equal(bad.success, false);

  const ok = profileSetupSchema.safeParse({
    nickname: '거제스윙',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    regionLabel: '거제',
    skillLevel: 'INTERMEDIATE',
  });
  assert.equal(ok.success, true);
});

test('store matching schema accepts reward 0 and female target', () => {
  const parsed = createStoreMatchingJoinSchema.safeParse({
    storeOwnershipId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-11T10:00:00.000Z',
    recruitClosesAt: '2026-09-11T07:00:00.000Z',
    targetMaleCount: 2,
    targetFemaleCount: 2,
    minimumPlayers: 3,
    matchingRewardTarget: 'FEMALE',
    rewardPerParticipant: '0',
  });
  assert.equal(parsed.success, true);
});

test('firstZodIssueCode surfaces minimum_exceeds_planned', () => {
  const parsed = createStoreMatchingJoinSchema.safeParse({
    storeOwnershipId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-11T10:00:00.000Z',
    recruitClosesAt: '2026-09-11T07:00:00.000Z',
    targetMaleCount: 1,
    targetFemaleCount: 1,
    minimumPlayers: 3,
    matchingRewardTarget: 'FEMALE',
    rewardPerParticipant: '0',
  });
  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.equal(firstZodIssueCode(parsed.error, 'invalid_store_matching_join'), 'minimum_exceeds_planned');
});

test('profile edit accepts lifestyle and handicap fields as nullable', () => {
  const parsed = profileEditSchema.safeParse({
    nickname: '거제스윙',
    age: 32,
    heightCm: 178,
    drinking: 'SOMETIMES',
    smoking: null,
    fieldHandicap: 12,
    screenHandicap: null,
    personality: '차분한 라운드',
  });
  assert.equal(parsed.success, true);
});

test('team play format requires size and count', () => {
  const missing = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
    playFormat: 'TEAM',
  });
  assert.equal(missing.success, false);

  const ok = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 8,
    joinMethod: 'OPEN',
    playFormat: 'TEAM',
    teamSize: 4,
    teamCount: 2,
  });
  assert.equal(ok.success, true);
});

test('profile match preference rejects inverted ranges', () => {
  const parsed = profileMatchPreferenceSchema.safeParse({
    minAge: 40,
    maxAge: 20,
  });
  assert.equal(parsed.success, false);
});

test('message policy and direct message schemas', () => {
  assert.equal(
    updateMessagePolicySchema.safeParse({
      enabled: true,
      premiumOnly: false,
      coinCostPerMessage: 0,
      friendsOnly: false,
    }).success,
    true,
  );
  assert.equal(
    updateMessagePolicySchema.safeParse({ coinCostPerMessage: -1 }).success,
    false,
  );
  assert.equal(
    createDirectConversationSchema.safeParse({
      peerUserId: '11111111-1111-4111-8111-111111111111',
    }).success,
    true,
  );
  assert.equal(
    postDirectMessageSchema.safeParse({ body: '안녕', idempotencyKey: 'msg-key-01' }).success,
    true,
  );
});

test('coin gift and reward policy schemas', () => {
  assert.equal(
    coinGiftSchema.safeParse({
      toUserId: '11111111-1111-4111-8111-111111111111',
      amount: '5',
      idempotencyKey: 'gift-key-01',
    }).success,
    true,
  );
  assert.equal(
    updateRewardPolicySchema.safeParse({ hostThreshold: 0 }).success,
    false,
  );
});

test('store profile, banner, and feature flag schemas', () => {
  assert.equal(
    upsertStoreProfileSchema.safeParse({
      screenBrand: 'OTHER',
      screenBrandOther: '자체 시뮬',
      visibility: 'PUBLIC',
    }).success,
    true,
  );
  assert.equal(upsertHomeBannerSchema.safeParse({ title: '가을' }).success, true);
  assert.equal(
    createStoreBannerAdSchema.safeParse({
      ownershipId: '11111111-1111-4111-8111-111111111111',
      title: '광고',
    }).success,
    true,
  );
  assert.equal(reviewStoreBannerAdSchema.safeParse({ action: 'APPROVE' }).success, true);
  assert.equal(
    scheduleStoreBannerAdSchema.safeParse({
      startsAt: '2026-09-20T00:00:00.000Z',
      endsAt: '2026-09-30T00:00:00.000Z',
    }).success,
    true,
  );
  assert.equal(updateFeatureFlagsSchema.safeParse({ clubsUiEnabled: false }).success, true);
});

test('recurring FIELD template keeps venueType and 포썸 TEAM fields', () => {
  const parsed = hostJoinRecurringTemplateSchema.safeParse({
    sportCode: 'SCREEN_GOLF',
    venueId: '11111111-1111-4111-8111-111111111111',
    venueType: 'FIELD',
    plannedPlayerCount: 4,
    playFormat: 'TEAM',
    teamSize: 2,
    teamCount: 2,
    joinMethod: 'OPEN',
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.venueType, 'FIELD');
    assert.equal(parsed.data.playFormat, 'TEAM');
    assert.equal(parsed.data.teamSize, 2);
  }
});

test('createJoin accepts SCREEN/FIELD venueType and defaults when omitted', () => {
  const base = {
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 4,
    joinMethod: 'OPEN' as const,
  };
  const omitted = createJoinSchema.safeParse(base);
  assert.equal(omitted.success, true);
  if (omitted.success) assert.equal(omitted.data.venueType, undefined);

  const field = createJoinSchema.safeParse({ ...base, venueType: 'FIELD', playFormat: 'TEAM', teamSize: 2, teamCount: 2 });
  assert.equal(field.success, true);

  const bad = createJoinSchema.safeParse({ ...base, venueType: 'PARK' });
  assert.equal(bad.success, false);
});

test('FIELD create rejects 6 / 3v3 and SCREEN fieldDetails', () => {
  const base = {
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    joinMethod: 'OPEN' as const,
  };
  const six = createJoinSchema.safeParse({
    ...base,
    plannedPlayerCount: 6,
    venueType: 'FIELD',
    playFormat: 'INDIVIDUAL',
  });
  assert.equal(six.success, false);

  const threeVthree = createJoinSchema.safeParse({
    ...base,
    plannedPlayerCount: 6,
    venueType: 'FIELD',
    playFormat: 'TEAM',
    teamSize: 3,
    teamCount: 2,
  });
  assert.equal(threeVthree.success, false);

  const screenFees = createJoinSchema.safeParse({
    ...base,
    plannedPlayerCount: 4,
    venueType: 'SCREEN',
    fieldDetails: { greenFeePerPerson: 80000 },
  });
  assert.equal(screenFees.success, false);
});

test('FIELD create accepts fees, rejects NO_CADDIE with a positive fee', () => {
  const ok = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
    venueType: 'FIELD',
    fieldDetails: {
      greenFeePerPerson: 90000,
      greenFeePayer: 'EACH_PERSON',
      cartFeeTotal: 80000,
      cartFeePayer: 'EQUAL_SPLIT',
      caddieMode: 'NO_CADDIE',
      roundHoles: 18,
      teeTimeMode: 'CONFIRMED',
    },
  });
  assert.equal(ok.success, true);

  const badCaddie = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
    venueType: 'FIELD',
    fieldDetails: {
      caddieMode: 'NO_CADDIE',
      caddieFeeTotal: 120000,
    },
  });
  assert.equal(badCaddie.success, false);
});

test('FIELD recruit 1-3 and gender quotas are confirmed-only', () => {
  const base = {
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    joinMethod: 'OPEN' as const,
    venueType: 'FIELD' as const,
  };
  const recruit3 = createJoinSchema.safeParse({
    ...base,
    plannedPlayerCount: 4,
    recruitCount: 3,
    genderCompositionMode: 'FIXED',
    targetMaleCount: 2,
    targetFemaleCount: 1,
    fieldDetails: {
      greenFeePerPerson: 90000,
      benefitGreenFee: true,
      benefitCart: true,
      benefitCaddie: false,
    },
  });
  assert.equal(recruit3.success, true);

  const genderMismatch = createJoinSchema.safeParse({
    ...base,
    plannedPlayerCount: 4,
    recruitCount: 3,
    genderCompositionMode: 'FIXED',
    targetMaleCount: 3,
    targetFemaleCount: 1,
  });
  assert.equal(genderMismatch.success, false);

  const recruit4 = createJoinSchema.safeParse({
    ...base,
    plannedPlayerCount: 5,
    recruitCount: 4,
  });
  assert.equal(recruit4.success, false);
});

test('SCREEN create capacities and foursome still pass without fieldDetails', () => {
  const screenSix = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 6,
    joinMethod: 'OPEN',
    venueType: 'SCREEN',
  });
  assert.equal(screenSix.success, true);

  const screenTeam = createJoinSchema.safeParse({
    venueId: '11111111-1111-4111-8111-111111111111',
    startAt: '2026-09-20T01:00:00.000Z',
    plannedPlayerCount: 8,
    joinMethod: 'OPEN',
    playFormat: 'TEAM',
    teamSize: 4,
    teamCount: 2,
  });
  assert.equal(screenTeam.success, true);
});

test('FIELD apply note is optional and capped', () => {
  assert.equal(applyJoinSchema.safeParse({}).success, true);
  assert.equal(applyJoinSchema.safeParse({ note: '잘 부탁드려요' }).success, true);
  assert.equal(applyJoinSchema.safeParse({ note: 'x'.repeat(81) }).success, false);
});

test('terms require all mandatory consents', () => {
  const bad = termsConsentSchema.safeParse({
    termsOfService: true,
    privacy: true,
    identity: false,
    location: true,
    marketing: false,
  });
  assert.equal(bad.success, false);
});
