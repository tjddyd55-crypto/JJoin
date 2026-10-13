import type { PickedProfileImage } from '../profile/profile-image-upload-payload';
import { normalizeUploadUri } from '../../lib/normalize-upload-uri';
import {
  buildReviewPhotoFileName,
  resolveReviewPhotoMimeType,
  uriScheme,
} from './join-review-photo-helpers';

export class ReviewPhotoPrepError extends Error {
  readonly code:
    | 'content_uri_copy_failed'
    | 'file_not_found'
    | 'file_size_zero'
    | 'unsupported_uri_scheme'
    | 'native_upload_init_failed';

  constructor(code: ReviewPhotoPrepError['code'], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export type ImagePickerAssetMeta = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
};

export function logJoinReviewPhotoPicked(asset: ImagePickerAssetMeta): void {
  if (!__DEV__) return;
  console.log('[join-review-photo] picked', {
    uri: asset.uri,
    scheme: uriScheme(asset.uri),
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    fileSize: asset.fileSize ?? null,
    width: asset.width ?? null,
    height: asset.height ?? null,
  });
}

export async function prepareReviewPhotoForUpload(
  picked: PickedProfileImage,
): Promise<PickedProfileImage> {
  if (__DEV__) console.log('[join-review-photo] normalize-start', { uri: picked.uri });
  let uri = picked.uri;
  if (!uri.startsWith('file://') && uriScheme(uri) === 'content') {
    try {
      uri = await normalizeUploadUri(uri, picked.mimeType, 'join-review-upload');
    } catch {
      throw new ReviewPhotoPrepError('content_uri_copy_failed');
    }
  }
  if (__DEV__) {
    console.log('[join-review-photo] normalize-done', { uri, scheme: uriScheme(uri) });
  }
  await assertUploadableUri(uri);
  return { ...picked, uri };
}

async function assertUploadableUri(uri: string): Promise<void> {
  const FileSystem = await import('expo-file-system/legacy');
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new ReviewPhotoPrepError('file_not_found');
  }
  const size = 'size' in info ? info.size : undefined;
  if (size == null || size <= 0) {
    throw new ReviewPhotoPrepError('file_size_zero');
  }
}
