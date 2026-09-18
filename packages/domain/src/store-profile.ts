/**
 * Verified store-owner public profile (distinct from GolfFacility gov-sync brand).
 */

export const STORE_SCREEN_BRANDS = ['GOLFZON', 'KAKAO_VX', 'SG_GOLF', 'OTHER'] as const;
export type StoreScreenBrand = (typeof STORE_SCREEN_BRANDS)[number];

export const STORE_PROFILE_VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;
export type StoreProfileVisibility = (typeof STORE_PROFILE_VISIBILITIES)[number];

export const STORE_AMENITY_PRESETS = [
  'PARKING',
  'SHOWER',
  'LOUNGE',
  'FOOD',
  'PRO_LESSON',
  'LEFT_HANDED',
  'NIGHT_OPEN',
] as const;
export type StoreAmenityPreset = (typeof STORE_AMENITY_PRESETS)[number];

export const STORE_INTRO_MAX = 400;
export const STORE_VIBE_MAX = 80;
export const STORE_BRAND_OTHER_MAX = 40;
export const STORE_MAX_PHOTOS = 8;

export type StoreProfilePermissionInput = {
  ownershipStatus: string;
  ownerUserId: string;
  actorUserId: string;
  isAdmin: boolean;
};

export function canEditStoreProfile(input: StoreProfilePermissionInput): boolean {
  if (input.isAdmin) return true;
  return input.ownershipStatus === 'ACTIVE' && input.ownerUserId === input.actorUserId;
}

export function canPublishStoreProfile(input: {
  visibility: StoreProfileVisibility;
  ownershipStatus: string;
}): boolean {
  return input.visibility === 'PUBLIC' && input.ownershipStatus === 'ACTIVE';
}

export function validateStoreScreenBrand(input: {
  screenBrand: StoreScreenBrand;
  screenBrandOther?: string | null;
}): { ok: true; screenBrandOther: string | null } | { ok: false; code: string } {
  if (!STORE_SCREEN_BRANDS.includes(input.screenBrand)) {
    return { ok: false, code: 'invalid_store_screen_brand' };
  }
  if (input.screenBrand === 'OTHER') {
    const text = input.screenBrandOther?.trim() ?? '';
    if (!text) return { ok: false, code: 'store_brand_other_required' };
    if (text.length > STORE_BRAND_OTHER_MAX) return { ok: false, code: 'store_brand_other_too_long' };
    return { ok: true, screenBrandOther: text };
  }
  return { ok: true, screenBrandOther: null };
}

export function formatStoreScreenBrandLabel(
  brand: StoreScreenBrand,
  otherText?: string | null,
): string {
  switch (brand) {
    case 'GOLFZON':
      return '골프존';
    case 'KAKAO_VX':
      return '카카오 VX';
    case 'SG_GOLF':
      return 'SG골프';
    case 'OTHER':
      return otherText?.trim() || '기타';
    default:
      return brand;
  }
}

export function formatStoreAmenityLabel(code: string): string {
  switch (code) {
    case 'PARKING':
      return '주차';
    case 'SHOWER':
      return '샤워';
    case 'LOUNGE':
      return '라운지';
    case 'FOOD':
      return '식음료';
    case 'PRO_LESSON':
      return '프로 레슨';
    case 'LEFT_HANDED':
      return '좌타석';
    case 'NIGHT_OPEN':
      return '심야 운영';
    default:
      return code;
  }
}

export function buildStoreProfileObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  ownershipId: string;
  kind: 'cover' | 'gallery';
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  return `${params.environmentPrefix}/stores/${params.ownershipId}/${params.kind}/${params.fileId}.${params.extension}`;
}
