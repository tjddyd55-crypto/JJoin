import { Linking, Platform } from 'react-native';

const APK_MIME = 'application/vnd.android.package-archive';

export type ApkInstallProgress = {
  totalBytes: number;
  downloadedBytes: number;
};

export async function downloadAndInstallApk(
  apkUrl: string,
  onProgress?: (progress: ApkInstallProgress) => void,
): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('apk_install_android_only');
  }

  const FileSystem = await import('expo-file-system/legacy');
  const IntentLauncher = await import('expo-intent-launcher');

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('apk_cache_unavailable');
  }

  const targetPath = `${cacheDir}jjoinzone-update.apk`;
  const callback = onProgress
    ? (data: { totalBytesExpectedToWrite: number; totalBytesWritten: number }) => {
        onProgress({
          totalBytes: data.totalBytesExpectedToWrite,
          downloadedBytes: data.totalBytesWritten,
        });
      }
    : undefined;

  const download = FileSystem.createDownloadResumable(apkUrl, targetPath, {}, callback);
  const result = await download.downloadAsync();
  if (!result?.uri) {
    throw new Error('apk_download_failed');
  }

  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: APK_MIME,
  });
}

export async function openUnknownAppInstallSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    const IntentLauncher = await import('expo-intent-launcher');
    await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES');
    return;
  } catch {
    // Fall through to generic settings.
  }

  await Linking.openSettings();
}
