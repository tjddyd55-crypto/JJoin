import { shouldForceAndroidUpdate } from '@jjoin/domain';

/**
 * Two update surfaces — never mix:
 * - soft_ota: expo-updates JS bundle. Background download + optional reload.
 * - mandatory_binary: APK/AAB / Play Store. Existing ProductionReleaseGate
 *   uses shouldForceAndroidUpdate(versionCode). Future minSupportedVersion
 *   belongs here, not in OTA.
 */
export type UpdateSurface = 'soft_ota' | 'mandatory_binary';

export type SoftOtaAction = 'none' | 'download_in_background' | 'prompt_reload';
export type MandatoryBinaryAction = 'none' | 'force_store_or_apk';

export type SoftOtaDecision = {
  surface: 'soft_ota';
  action: SoftOtaAction;
};

export type MandatoryBinaryDecision = {
  surface: 'mandatory_binary';
  action: MandatoryBinaryAction;
};

/**
 * Reserved for a later API-driven floor. Not published and not wired to OTA.
 * ProductionReleaseGate remains the live binary gate today.
 */
export type MinSupportedVersionPolicy = {
  minSupportedVersion: string | null;
  minSupportedVersionCode: number | null;
};

export const UNSET_MIN_SUPPORTED_VERSION: MinSupportedVersionPolicy = {
  minSupportedVersion: null,
  minSupportedVersionCode: null,
};

export function resolveSoftOtaDecision(input: {
  isEnabled: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  dismissedThisSession: boolean;
}): SoftOtaDecision {
  if (!input.isEnabled) {
    return { surface: 'soft_ota', action: 'none' };
  }
  if (input.isUpdatePending && !input.dismissedThisSession) {
    return { surface: 'soft_ota', action: 'prompt_reload' };
  }
  if (input.isUpdateAvailable) {
    return { surface: 'soft_ota', action: 'download_in_background' };
  }
  return { surface: 'soft_ota', action: 'none' };
}

export function shouldForceMinSupportedBinary(
  currentVersionCode: number,
  minSupportedVersionCode: number | null,
): boolean {
  if (minSupportedVersionCode == null || minSupportedVersionCode <= 0) return false;
  if (!Number.isInteger(currentVersionCode) || currentVersionCode < 0) return false;
  return currentVersionCode < minSupportedVersionCode;
}

export function resolveMandatoryBinaryDecision(input: {
  currentVersionCode: number;
  publishedLatestVersionCode: number;
  minSupportedVersionCode: number | null;
}): MandatoryBinaryDecision {
  const forcePublished = shouldForceAndroidUpdate(
    input.currentVersionCode,
    input.publishedLatestVersionCode,
  );
  const forceMinSupported = shouldForceMinSupportedBinary(
    input.currentVersionCode,
    input.minSupportedVersionCode,
  );
  if (forcePublished || forceMinSupported) {
    return { surface: 'mandatory_binary', action: 'force_store_or_apk' };
  }
  return { surface: 'mandatory_binary', action: 'none' };
}
