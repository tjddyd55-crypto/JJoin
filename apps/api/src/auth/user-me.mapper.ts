import {
  AgeBand,
  IdentityStatus,
  SocialLinkStatus,
  SocialProvider,
  SportSkillLevel,
  type MeDto,
  type PublicUserProfileDto,
} from '@jjoin/types';
import { addCoinAmounts, mapGenderDisplay, resolveOnboardingStep } from '@jjoin/domain';
import type { ConsentType, Prisma } from '@prisma/client';
import { TERMS_VERSION, REQUIRED_CONSENT_TYPES } from './consent-policy';

export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    profile: true;
    socialAccounts: true;
    sportProfiles: { include: { sport: true } };
    wallets: true;
    identityVerifications: { orderBy: { createdAt: 'desc' }; take: 1 };
    consents: true;
  };
}>;

function hasRequiredConsents(consents: UserWithRelations['consents']): boolean {
  return REQUIRED_CONSENT_TYPES.every((type) =>
    consents.some((c) => c.type === type && c.version === TERMS_VERSION && c.agreed),
  );
}

function hasLocationConsent(consents: UserWithRelations['consents']): boolean {
  return consents.some(
    (c) => c.type === 'LOCATION' && c.version === TERMS_VERSION && c.agreed,
  );
}

function hasAvatarSkipped(consents: UserWithRelations['consents']): boolean {
  return consents.some((c) => c.type === 'AVATAR_SKIPPED' && c.agreed);
}

function isProfileComplete(profile: UserWithRelations['profile'], sportProfiles: UserWithRelations['sportProfiles']): boolean {
  if (!profile?.nickname || !profile.regionLabel || !profile.gender || !profile.ageBand) {
    return false;
  }
  return sportProfiles.length > 0;
}

export function buildMeFromUser(
  user: UserWithRelations,
  participationCount = 0,
): MeDto {
  const profile = user.profile;
  const termsAccepted = hasRequiredConsents(user.consents);
  const profileComplete = isProfileComplete(profile, user.sportProfiles);
  const hasAvatar = Boolean(profile?.avatarAssetId) || hasAvatarSkipped(user.consents);
  const locationOnboardingComplete = hasLocationConsent(user.consents);

  const publicProfile: PublicUserProfileDto | null = profile
    ? {
        id: user.id,
        nickname: profile.nickname,
        avatarUrl: null,
        verifiedBadge: user.identityStatus === IdentityStatus.VERIFIED,
        genderDisplay: profile.gender ? mapGenderDisplay(profile.gender) : null,
        ageBand: (profile.ageBand as AgeBand | null) ?? null,
        regionLabel: profile.regionLabel,
        bio: profile.bio,
        sportProfiles: user.sportProfiles.map((sp) => ({
          sportCode: sp.sport.code,
          skillLevel: sp.skillLevel as SportSkillLevel,
        })),
        participationCount,
      }
    : null;

  const wallet = user.wallets[0];
  const latestIdentity = user.identityVerifications[0];

  return {
    userId: user.id,
    authAppHints: {
      termsAccepted,
      profileComplete,
      hasAvatar,
      locationOnboardingComplete,
    },
    publicProfile,
    identity: {
      verificationStatus: user.identityStatus as IdentityStatus,
      verifiedAt: latestIdentity?.verifiedAt?.toISOString() ?? null,
      provider: latestIdentity?.provider ?? null,
    },
    socialLinks: Object.values(SocialProvider).map((p) => ({
      provider: p,
      status: user.socialAccounts.some((s) => s.provider === p)
        ? SocialLinkStatus.CONNECTED
        : SocialLinkStatus.NOT_CONNECTED,
    })),
    walletSummary: {
      assetCode: 'JJOIN',
      availableCoin: wallet ? String(wallet.availableBalance) : '0',
      heldCoin: wallet ? String(wallet.heldBalance) : '0',
      totalCoin: wallet
        ? addCoinAmounts(String(wallet.availableBalance), String(wallet.heldBalance))
        : '0',
      recentTransactions: [],
    },
  };
}

export function resolveNextOnboardingStep(me: MeDto): ReturnType<typeof resolveOnboardingStep> {
  // Keep API nextStep aligned with domain (profile before deferred identity).
  return resolveOnboardingStep(me);
}

export const CONSENT_FIELD_MAP: Record<string, ConsentType> = {
  termsOfService: 'TERMS_OF_SERVICE',
  privacy: 'PRIVACY_POLICY',
  identity: 'IDENTITY_NOTICE',
  location: 'LOCATION',
  marketing: 'MARKETING',
};

export function buildPublicProfileFromUser(
  user: UserWithRelations,
  participationCount: number,
): PublicUserProfileDto {
  const me = buildMeFromUser(user, participationCount);
  if (!me.publicProfile) throw new Error('profile_missing');
  return me.publicProfile;
}
