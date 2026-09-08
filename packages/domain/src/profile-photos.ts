import type { AppVariantName } from './app-variant';

export const MAX_PROFILE_GALLERY_PHOTOS = 5;
export const PROFILE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const PROFILE_AVATAR_MAX_EDGE_PX = 1080;
export const PROFILE_GALLERY_MAX_EDGE_PX = 1600;

export const ALLOWED_PROFILE_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedProfileImageMime = (typeof ALLOWED_PROFILE_IMAGE_MIMES)[number];

const SAFE_OBJECT_KEY_SEGMENT = /^[a-zA-Z0-9_-]+$/;

export function resolveStorageEnvironmentPrefix(appVariant: AppVariantName): 'development' | 'production' {
  return appVariant === 'development' ? 'development' : 'production';
}

export function normalizeImageExtension(mimeType: string): 'jpg' | 'png' | 'webp' {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      throw new Error('unsupported_image_mime');
  }
}

export function isAllowedProfileImageMime(mimeType: string): mimeType is AllowedProfileImageMime {
  return (ALLOWED_PROFILE_IMAGE_MIMES as readonly string[]).includes(mimeType);
}

function assertSafeSegment(value: string, label: string): string {
  if (!SAFE_OBJECT_KEY_SEGMENT.test(value)) {
    throw new Error(`invalid_${label}`);
  }
  return value;
}

export function buildProfileAvatarObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  userId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const userId = assertSafeSegment(params.userId, 'user_id');
  const fileId = assertSafeSegment(params.fileId, 'file_id');
  const environmentPrefix = assertSafeSegment(params.environmentPrefix, 'environment_prefix');
  return `${environmentPrefix}/profiles/${userId}/avatar/${fileId}.${params.extension}`;
}

export function buildProfileGalleryObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  userId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const userId = assertSafeSegment(params.userId, 'user_id');
  const fileId = assertSafeSegment(params.fileId, 'file_id');
  const environmentPrefix = assertSafeSegment(params.environmentPrefix, 'environment_prefix');
  return `${environmentPrefix}/profiles/${userId}/gallery/${fileId}.${params.extension}`;
}

export function buildPublicObjectUrl(publicBaseUrl: string, objectKey: string): string | null {
  const base = publicBaseUrl.trim().replace(/\/+$/, '');
  const key = objectKey.trim().replace(/^\/+/, '');
  if (!base || !key) return null;
  const normalizedBase = base.startsWith('http://') ? base.replace('http://', 'https://') : base;
  return `${normalizedBase}/${key}`;
}

export function isOwnedProfileObjectKey(params: {
  objectKey: string;
  environmentPrefix: 'development' | 'production';
  userId: string;
}): boolean {
  const key = params.objectKey.replace(/^\/+/, '');
  const avatarPrefix = `${params.environmentPrefix}/profiles/${params.userId}/avatar/`;
  const galleryPrefix = `${params.environmentPrefix}/profiles/${params.userId}/gallery/`;
  return key.startsWith(avatarPrefix) || key.startsWith(galleryPrefix);
}
