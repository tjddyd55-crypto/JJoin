import { useMemo } from 'react';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import {
  resolveSoftOtaDecision,
  type SoftOtaDecision,
} from '../model/update-surface';

export type SoftOtaHookState = SoftOtaDecision & {
  isEnabled: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  isDownloading: boolean;
  reload: () => Promise<void>;
};

/**
 * Soft OTA state. Never auto-reloads — the prompt owns the user gesture.
 */
export function useSoftOtaUpdate(dismissedThisSession: boolean): SoftOtaHookState {
  const nativeEnabled = Platform.OS !== 'web' && Updates.isEnabled;
  const updates = Updates.useUpdates();

  const decision = useMemo(
    () =>
      resolveSoftOtaDecision({
        isEnabled: nativeEnabled,
        isUpdateAvailable: updates.isUpdateAvailable,
        isUpdatePending: updates.isUpdatePending,
        dismissedThisSession,
      }),
    [
      nativeEnabled,
      updates.isUpdateAvailable,
      updates.isUpdatePending,
      dismissedThisSession,
    ],
  );

  return {
    ...decision,
    isEnabled: nativeEnabled,
    isUpdateAvailable: updates.isUpdateAvailable,
    isUpdatePending: updates.isUpdatePending,
    isDownloading: updates.isDownloading,
    reload: reloadFromUserGesture,
  };
}

async function reloadFromUserGesture(): Promise<void> {
  if (Platform.OS === 'web' || !Updates.isEnabled) return;
  await Updates.reloadAsync();
}
