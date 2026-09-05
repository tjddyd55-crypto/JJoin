import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertPublicProfileHasNoPrivateFields,
  computeConfirmedPlayerCount,
  nextJoinStatusAfterRoster,
  requiresIdentityGate,
  resolveAuthAppState,
  resolveOnboardingStep,
  SCREEN_GOLF_DURATION_RULE,
  autoPayAt,
  estimateEndAt,
} from './index';
import {
  AuthAppState,
  IdentityStatus,
  MockAuthScenario,
  SocialLinkStatus,
  SocialProvider,
  type MeDto,
  type PublicUserProfileDto,
} from '@jjoin/types';

function baseMe(overrides: Partial<MeDto> = {}): MeDto {
  return {
    userId: 'u1',
    authAppHints: {
      termsAccepted: true,
      profileComplete: true,
      hasAvatar: true,
      locationOnboardingComplete: true,
      ...overrides.authAppHints,
    },
    publicProfile: {
      id: 'u1',
      nickname: 'golfer',
      avatarUrl: null,
      verifiedBadge: true,
      genderDisplay: '남성',
      ageBand: null,
      regionLabel: '거제',
      bio: null,
      sportProfiles: [],
      participationCount: 0,
    },
    identity: {
      verificationStatus: IdentityStatus.VERIFIED,
      verifiedAt: '2026-01-01T00:00:00.000Z',
      provider: 'MOCK',
      ...overrides.identity,
    },
    socialLinks: [
      { provider: SocialProvider.KAKAO, status: SocialLinkStatus.CONNECTED },
      { provider: SocialProvider.NAVER, status: SocialLinkStatus.NOT_CONNECTED },
      { provider: SocialProvider.GOOGLE, status: SocialLinkStatus.NOT_CONNECTED },
    ],
    walletSummary: {
      assetCode: 'JJOIN',
      availableCoin: '0',
      heldCoin: '0',
      pendingPayoutCoin: '0',
      totalCoin: '0',
      recentTransactions: [],
    },
    premiumStatus: {
      active: false,
      startedAt: null,
      expiresAt: null,
      remainingDays: null,
    },
    ...overrides,
  };
}

test('screen golf end time = start + players * 60m', () => {
  const start = new Date('2026-08-21T04:00:00.000Z');
  const end = estimateEndAt({
    startAt: start,
    playerCount: 4,
    rule: SCREEN_GOLF_DURATION_RULE,
  });
  assert.equal(end.toISOString(), '2026-08-21T08:00:00.000Z');
});

test('auto pay is +24h from scheduled end', () => {
  const end = new Date('2026-08-21T08:00:00.000Z');
  assert.equal(autoPayAt(end).toISOString(), '2026-08-22T08:00:00.000Z');
});

test('resolveAuthAppState: unauthenticated', () => {
  assert.equal(resolveAuthAppState(null, false), AuthAppState.UNAUTHENTICATED);
});

test('resolveAuthAppState: needs terms', () => {
  const me = baseMe({
    authAppHints: {
      termsAccepted: false,
      profileComplete: false,
      hasAvatar: false,
      locationOnboardingComplete: false,
    },
  });
  assert.equal(resolveAuthAppState(me, true), AuthAppState.AUTHENTICATED_NEEDS_TERMS);
});

test('resolveAuthAppState: incomplete profile before deferred identity', () => {
  const me = baseMe({
    authAppHints: {
      termsAccepted: true,
      profileComplete: false,
      hasAvatar: false,
      locationOnboardingComplete: false,
    },
    publicProfile: null,
    identity: {
      verificationStatus: IdentityStatus.UNVERIFIED,
      verifiedAt: null,
      provider: null,
    },
  });
  assert.equal(resolveAuthAppState(me, true), AuthAppState.AUTHENTICATED_PROFILE_INCOMPLETE);
});

test('resolveAuthAppState: identity unverified but profile ready', () => {
  const me = baseMe({
    identity: {
      verificationStatus: IdentityStatus.UNVERIFIED,
      verifiedAt: null,
      provider: null,
    },
  });
  assert.equal(resolveAuthAppState(me, true), AuthAppState.AUTHENTICATED_IDENTITY_UNVERIFIED);
});

test('onboarding new user path', () => {
  const me = baseMe({
    authAppHints: {
      termsAccepted: false,
      profileComplete: false,
      hasAvatar: false,
      locationOnboardingComplete: false,
    },
    identity: {
      verificationStatus: IdentityStatus.UNVERIFIED,
      verifiedAt: null,
      provider: null,
    },
  });
  assert.equal(resolveOnboardingStep(me), 'TERMS');
});

test('onboarding: profile setup before identity after terms', () => {
  const me = baseMe({
    authAppHints: {
      termsAccepted: true,
      profileComplete: false,
      hasAvatar: false,
      locationOnboardingComplete: false,
    },
    publicProfile: null,
    identity: {
      verificationStatus: IdentityStatus.UNVERIFIED,
      verifiedAt: null,
      provider: null,
    },
  });
  assert.equal(resolveOnboardingStep(me), 'PROFILE_SETUP');
});

test('identity gate blocks create/apply when unverified', () => {
  assert.equal(requiresIdentityGate(IdentityStatus.UNVERIFIED, 'CREATE_JOIN'), true);
  assert.equal(requiresIdentityGate(IdentityStatus.VERIFIED, 'APPLY_JOIN'), false);
});

test('public profile deny-list', () => {
  const profile: PublicUserProfileDto = {
    id: 'u1',
    nickname: 'a',
    avatarUrl: null,
    verifiedBadge: false,
    genderDisplay: null,
    ageBand: null,
    regionLabel: null,
    bio: null,
    sportProfiles: [],
    participationCount: 0,
  };
  assert.doesNotThrow(() => assertPublicProfileHasNoPrivateFields(profile));
  assert.throws(() =>
    assertPublicProfileHasNoPrivateFields({
      ...profile,
      phone: '010',
    } as PublicUserProfileDto & { phone: string }),
  );
});

test('mock scenario enum exists for QA', () => {
  assert.equal(MockAuthScenario.NEW_USER, 'NEW_USER');
  assert.equal(MockAuthScenario.RETURNING_USER, 'RETURNING_USER');
});

test('confirmed count and FULL transition', () => {
  assert.equal(computeConfirmedPlayerCount(['APPROVED', 'APPLIED', 'APPROVED']), 2);
  assert.equal(
    nextJoinStatusAfterRoster({
      currentStatus: 'OPEN',
      confirmedPlayerCount: 4,
      plannedPlayerCount: 4,
    }),
    'FULL',
  );
  assert.equal(
    nextJoinStatusAfterRoster({
      currentStatus: 'OPEN',
      confirmedPlayerCount: 2,
      plannedPlayerCount: 4,
    }),
    'OPEN',
  );
});
