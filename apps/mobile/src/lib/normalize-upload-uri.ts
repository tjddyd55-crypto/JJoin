import { Platform } from 'react-native';
import { cacheExtensionForMime, uriScheme } from '../features/join-review-board/join-review-photo-helpers';

export { cacheExtensionForMime, uriScheme };

/**
 * Materialize Android content:// (and other non-file) URIs into app cache for native upload.
 */
export async function normalizeUploadUri(
  uri: string,
  mimeType: string,
  cacheNamePrefix = 'upload',
): Promise<string> {
  if (Platform.OS !== 'android') {
    return uri;
  }
  if (uri.startsWith('file://') || uri.startsWith('/')) {
    return toFileUri(uri);
  }
  const scheme = uriScheme(uri);
  if (scheme !== 'content' && scheme !== 'file' && scheme !== 'unknown') {
    throw new Error(`unsupported_uri_scheme:${scheme}`);
  }
  if (scheme === 'file') {
    return uri.startsWith('file://') ? uri : `file://${uri}`;
  }

  const FileSystem = await import('expo-file-system/legacy');
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('content_uri_copy_failed:no_cache_dir');
  }
  const ext = cacheExtensionForMime(mimeType);
  const dest = `${cacheDir}${cacheNamePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
  } catch {
    throw new Error('content_uri_copy_failed');
  }
  return toFileUri(dest);
}

function toFileUri(path: string): string {
  if (path.startsWith('file://')) return path;
  if (path.startsWith('/')) return `file://${path}`;
  return path;
}
