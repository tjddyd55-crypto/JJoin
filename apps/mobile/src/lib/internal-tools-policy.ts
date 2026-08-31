/** Production Android / iOS identity — mock/QA chrome must never appear here. */
export const PRODUCTION_APPLICATION_ID = 'com.jjoin.app';

/**
 * Pure gate for user-visible mock/QA chrome.
 * Requires APP_VARIANT=development; Production package identity always denied.
 * Keep free of Expo/RN imports so unit tests stay Node-runnable.
 */
export function shouldEnableInternalTools(input: {
  appVariant: string | undefined;
  applicationId: string | null;
}): boolean {
  if (input.applicationId === PRODUCTION_APPLICATION_ID) {
    return false;
  }
  return input.appVariant === 'development';
}
