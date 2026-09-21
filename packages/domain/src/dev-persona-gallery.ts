import { MAX_PROFILE_GALLERY_PHOTOS } from './profile-photos';

/**
 * Extra photoreal frames already uploaded with the DEV investor-demo pack.
 * Keys stay under development/investor-demo/v2 so production media never matches.
 */
export const DEV_PERSONA_GALLERY_EXTRA_OBJECT_KEYS = [
  'development/investor-demo/v2/field/field.jpg',
  'development/investor-demo/v2/field/clubhouse.jpg',
  'development/investor-demo/v2/field/screen.jpg',
  'development/investor-demo/v2/stores/gangnam-g1.jpg',
  'development/investor-demo/v2/stores/gangnam-g2.jpg',
  'development/investor-demo/v2/stores/gangnam-g3.jpg',
  'development/investor-demo/v2/stores/bundang-g1.jpg',
  'development/investor-demo/v2/stores/bundang-g2.jpg',
  'development/investor-demo/v2/stores/haeundae-g1.jpg',
  'development/investor-demo/v2/stores/haeundae-g2.jpg',
  'development/investor-demo/v2/stores/songdo-g1.jpg',
  'development/investor-demo/v2/stores/songdo-g2.jpg',
  'development/investor-demo/v2/stores/songpa-g1.jpg',
] as const;

const DEV_GALLERY_EXTRA_COUNT = 3;

export function isDevPersonaAvatarObjectKey(objectKey: string): boolean {
  const key = objectKey.trim();
  if (!key || key.startsWith('production/')) return false;
  return key.includes('/investor-demo/') && key.includes('/avatars/');
}

function stableStartIndex(seed: string, length: number): number {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }
  return length === 0 ? 0 : hash % length;
}

/**
 * Primary avatar plus three distinct scene photos.
 * Each persona gets a stable slice so galleries are not identical.
 */
export function buildDevPersonaGalleryObjectKeys(avatarObjectKey: string): string[] {
  const avatar = avatarObjectKey.trim();
  if (!isDevPersonaAvatarObjectKey(avatar)) {
    throw new Error('dev_persona_gallery_key_rejected');
  }

  const pool = DEV_PERSONA_GALLERY_EXTRA_OBJECT_KEYS;
  const start = stableStartIndex(avatar, pool.length);
  const extras: string[] = [];
  for (let offset = 0; extras.length < DEV_GALLERY_EXTRA_COUNT && offset < pool.length; offset += 1) {
    const key = pool[(start + offset) % pool.length];
    if (key !== avatar) extras.push(key);
  }

  return [avatar, ...extras].slice(0, MAX_PROFILE_GALLERY_PHOTOS);
}

export function assertDevPersonaGallerySeedAllowed(env: {
  appVariant?: string | null;
  railwayEnvironment?: string | null;
}): void {
  const variant = (env.appVariant ?? '').trim().toLowerCase();
  const railway = (env.railwayEnvironment ?? '').trim().toLowerCase();
  if (variant === 'production' || railway === 'production') {
    throw new Error('dev_persona_gallery_seed_refuses_production');
  }
  if (variant !== 'development' && railway !== 'development') {
    throw new Error('dev_persona_gallery_seed_requires_explicit_development');
  }
}
