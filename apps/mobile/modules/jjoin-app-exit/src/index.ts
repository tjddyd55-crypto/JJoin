import { requireOptionalNativeModule } from 'expo-modules-core';
import { BackHandler, Platform } from 'react-native';

type JjoinAppExitNativeModule = {
  exitCompletely: () => void;
};

const native = requireOptionalNativeModule<JjoinAppExitNativeModule>('JjoinAppExit');

/** Android only: finish task + kill process for a real cold start on next launch. */
export function exitAndroidAppCompletely(): void {
  if (Platform.OS !== 'android') {
    BackHandler.exitApp();
    return;
  }
  if (native?.exitCompletely) {
    native.exitCompletely();
    return;
  }
  BackHandler.exitApp();
}

export function isAndroidCompleteExitAvailable(): boolean {
  return Platform.OS === 'android' && native?.exitCompletely != null;
}
