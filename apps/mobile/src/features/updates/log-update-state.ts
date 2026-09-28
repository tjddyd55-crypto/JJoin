import * as Updates from 'expo-updates';
import { isDevelopmentVariant } from '../../lib/app-variant';

/**
 * Bump when publishing a DEV OTA you want to spot in logcat.
 * Log-only; never rendered.
 */
export const DEV_OTA_MARKER = 'embedded';

/** DEV binary only: one logcat line showing which JS bundle is running. */
export function logDevUpdateState(): void {
  if (!isDevelopmentVariant()) return;
  console.info(
    '[ota]',
    JSON.stringify({
      marker: DEV_OTA_MARKER,
      updateId: Updates.updateId ?? null,
      channel: Updates.channel ?? null,
      runtimeVersion: Updates.runtimeVersion ?? null,
      isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      isEnabled: Updates.isEnabled,
    }),
  );
}
