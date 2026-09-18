/**
 * Product feature flags — UI/API kill switches.
 * Clubs data/API stay intact; clubsUiEnabled only gates user-facing surfaces.
 */

export const FEATURE_FLAG_SETTINGS_ID = 'default';

export type FeatureFlagSnapshot = {
  clubsUiEnabled: boolean;
  profileMatchAlertsEnabled: boolean;
  storeProfilesEnabled: boolean;
  homeBannersEnabled: boolean;
  storeBannerAdsEnabled: boolean;
  coinGiftEnabled: boolean;
  attendanceRewardsEnabled: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlagSnapshot = {
  clubsUiEnabled: false,
  profileMatchAlertsEnabled: true,
  storeProfilesEnabled: true,
  homeBannersEnabled: true,
  storeBannerAdsEnabled: true,
  coinGiftEnabled: true,
  attendanceRewardsEnabled: true,
};

export function normalizeFeatureFlags(
  input?: Partial<FeatureFlagSnapshot> | null,
): FeatureFlagSnapshot {
  return {
    clubsUiEnabled: input?.clubsUiEnabled ?? DEFAULT_FEATURE_FLAGS.clubsUiEnabled,
    profileMatchAlertsEnabled:
      input?.profileMatchAlertsEnabled ?? DEFAULT_FEATURE_FLAGS.profileMatchAlertsEnabled,
    storeProfilesEnabled: input?.storeProfilesEnabled ?? DEFAULT_FEATURE_FLAGS.storeProfilesEnabled,
    homeBannersEnabled: input?.homeBannersEnabled ?? DEFAULT_FEATURE_FLAGS.homeBannersEnabled,
    storeBannerAdsEnabled:
      input?.storeBannerAdsEnabled ?? DEFAULT_FEATURE_FLAGS.storeBannerAdsEnabled,
    coinGiftEnabled: input?.coinGiftEnabled ?? DEFAULT_FEATURE_FLAGS.coinGiftEnabled,
    attendanceRewardsEnabled:
      input?.attendanceRewardsEnabled ?? DEFAULT_FEATURE_FLAGS.attendanceRewardsEnabled,
  };
}

export function isClubsUiEnabled(flags: FeatureFlagSnapshot): boolean {
  return flags.clubsUiEnabled === true;
}

export function isClubDeepLinkAvailable(flags: FeatureFlagSnapshot): boolean {
  return isClubsUiEnabled(flags);
}
