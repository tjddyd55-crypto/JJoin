import { JOIN_REVIEW_POST_PHOTO_MAX } from '@jjoin/domain';

export function remainingJoinReviewPhotoSlots(currentCount: number): number {
  return Math.max(0, JOIN_REVIEW_POST_PHOTO_MAX - currentCount);
}

export function cacheExtensionForMime(mimeType: string): string {
  const m = mimeType.trim().toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/heic') return 'heic';
  if (m === 'image/heif') return 'heif';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  return 'jpg';
}

export function uriScheme(uri: string): string {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(uri.trim());
  return match?.[1]?.toLowerCase() ?? 'unknown';
}

export function buildReviewPhotoFileName(mimeType: string, fileName?: string | null): string {
  const trimmed = fileName?.trim();
  if (trimmed) return trimmed;
  return `review-${Date.now()}.${cacheExtensionForMime(mimeType)}`;
}

export function resolveReviewPhotoMimeType(mimeType?: string | null): string {
  const m = (mimeType ?? '').trim().toLowerCase();
  if (
    m === 'image/jpeg' ||
    m === 'image/jpg' ||
    m === 'image/png' ||
    m === 'image/webp' ||
    m === 'image/heic' ||
    m === 'image/heif'
  ) {
    return m === 'image/jpg' ? 'image/jpeg' : m;
  }
  return 'image/jpeg';
}
