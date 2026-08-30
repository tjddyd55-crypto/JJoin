import * as Application from 'expo-application';
import { shouldEnableInternalTools } from './internal-tools-policy';

/**
 * Gates user-visible mock/QA chrome (login DEV USER, mock identity, /dev routes, …).
 *
 * Policy:
 * - Requires APP_VARIANT === 'development' (not __DEV__).
 * - Production package identity is always denied, even if Metro/.env
 *   incorrectly sets APP_VARIANT=development while running com.jjoin.app.
 *
 * Developer console logging may still use __DEV__; do not reuse this for logs.
 */
export function isInternalToolsEnabled(): boolean {
  return shouldEnableInternalTools({
    appVariant: process.env.APP_VARIANT,
    applicationId: Application.applicationId ?? null,
  });
}

export { shouldEnableInternalTools } from './internal-tools-policy';
