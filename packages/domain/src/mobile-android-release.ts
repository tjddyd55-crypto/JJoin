export const ANDROID_MOBILE_RELEASE_SETTINGS_ID = 'default';

export const MOBILE_ANDROID_RELEASE_LIMITS = {
  versionNameMax: 32,
  apkUrlMax: 2048,
  releaseNotesMax: 4000,
} as const;

export type MobileAndroidReleaseValues = {
  latestVersionCode: number;
  latestVersionName: string;
  apkUrl: string;
  releaseNotes: string | null;
  publishedAt: string | null;
};

export type MobileAndroidReleaseUpdateInput = {
  latestVersionCode?: number;
  latestVersionName?: string;
  apkUrl?: string;
  releaseNotes?: string | null;
};

export function normalizeHttpsApkUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const url = new URL(trimmed);
  if (url.protocol !== 'https:') {
    throw new Error('apk_url_must_be_https');
  }
  return url.toString();
}

export function validateMobileAndroidReleaseUpdate(
  input: MobileAndroidReleaseUpdateInput,
): MobileAndroidReleaseUpdateInput {
  const patch: MobileAndroidReleaseUpdateInput = {};

  if (input.latestVersionCode !== undefined) {
    if (!Number.isInteger(input.latestVersionCode) || input.latestVersionCode < 0) {
      throw new Error('invalid_latest_version_code');
    }
    patch.latestVersionCode = input.latestVersionCode;
  }

  if (input.latestVersionName !== undefined) {
    const name = input.latestVersionName.trim();
    if (!name || name.length > MOBILE_ANDROID_RELEASE_LIMITS.versionNameMax) {
      throw new Error('invalid_latest_version_name');
    }
    patch.latestVersionName = name;
  }

  if (input.apkUrl !== undefined) {
    const apkUrl = normalizeHttpsApkUrl(input.apkUrl);
    if (apkUrl.length > MOBILE_ANDROID_RELEASE_LIMITS.apkUrlMax) {
      throw new Error('apk_url_too_long');
    }
    patch.apkUrl = apkUrl;
  }

  if (input.releaseNotes !== undefined) {
    if (input.releaseNotes === null) {
      patch.releaseNotes = null;
    } else {
      const notes = input.releaseNotes.trim();
      if (notes.length > MOBILE_ANDROID_RELEASE_LIMITS.releaseNotesMax) {
        throw new Error('release_notes_too_long');
      }
      patch.releaseNotes = notes.length ? notes : null;
    }
  }

  return patch;
}

/** Force update when a published release exists and the app is behind. */
export function shouldForceAndroidUpdate(
  currentVersionCode: number,
  latestVersionCode: number,
): boolean {
  if (!Number.isInteger(currentVersionCode) || currentVersionCode < 0) return false;
  if (!Number.isInteger(latestVersionCode) || latestVersionCode <= 0) return false;
  return currentVersionCode < latestVersionCode;
}

export function isPublishableAndroidRelease(values: MobileAndroidReleaseValues): boolean {
  return (
    values.latestVersionCode > 0 &&
    values.latestVersionName.trim().length > 0 &&
    values.apkUrl.trim().startsWith('https://')
  );
}
