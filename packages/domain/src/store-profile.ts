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
export const STORE_SCREEN_MODEL_MAX = 60;
export const STORE_PHONE_MAX = 20;
export const STORE_RESERVATION_LABEL_MAX = 40;
export const STORE_RESERVATION_URL_MAX = 500;
export const STORE_RESERVATION_NOTE_MAX = 400;
export const STORE_PARKING_NOTE_MAX = 120;
export const STORE_MAX_PHOTOS = 10;
export const STORE_MAX_PRICE_SLOTS = 24;
export const STORE_MAX_OPERATING_HOURS = 14;
export const STORE_ROOM_COUNT_MAX = 99;

export const STORE_OPERATING_DAY_GROUPS = [
  'WEEKDAY',
  'WEEKEND',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
] as const;
export type StoreOperatingDayGroup = (typeof STORE_OPERATING_DAY_GROUPS)[number];

export const STORE_PRICE_DAY_TYPES = ['WEEKDAY', 'WEEKEND', 'ALL'] as const;
export type StorePriceDayType = (typeof STORE_PRICE_DAY_TYPES)[number];

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

export function isOwnedStoreProfileObjectKey(params: {
  objectKey: string;
  environmentPrefix: 'development' | 'production';
  ownershipId: string;
}): boolean {
  const key = params.objectKey.replace(/^\/+/, '');
  const prefix = `${params.environmentPrefix}/stores/${params.ownershipId}/`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  const [kind] = rest.split('/');
  return (kind === 'cover' || kind === 'gallery') && rest.split('/').length === 2;
}

export function formatStoreOperatingDayGroupLabel(
  dayGroup: StoreOperatingDayGroup,
  customLabel?: string | null,
): string {
  if (customLabel?.trim()) return customLabel.trim();
  switch (dayGroup) {
    case 'WEEKDAY':
      return '평일';
    case 'WEEKEND':
      return '주말';
    case 'MON':
      return '월';
    case 'TUE':
      return '화';
    case 'WED':
      return '수';
    case 'THU':
      return '목';
    case 'FRI':
      return '금';
    case 'SAT':
      return '토';
    case 'SUN':
      return '일';
    default:
      return dayGroup;
  }
}

export function formatOperatingHoursLine(input: {
  dayGroup: StoreOperatingDayGroup;
  label?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isClosed?: boolean;
  is24Hours?: boolean;
}): string {
  const dayLabel = formatStoreOperatingDayGroupLabel(input.dayGroup, input.label);
  if (input.isClosed) return `${dayLabel} 휴무`;
  if (input.is24Hours) return `${dayLabel} 24시간`;
  const start = input.startTime?.trim() ?? '';
  const end = input.endTime?.trim() ?? '';
  if (!start || !end) return dayLabel;
  return `${dayLabel} ${start} ~ ${end}`;
}

export function formatStorePriceDayTypeLabel(dayType: StorePriceDayType): string {
  switch (dayType) {
    case 'WEEKDAY':
      return '평일';
    case 'WEEKEND':
      return '주말';
    case 'ALL':
      return '전체';
    default:
      return dayType;
  }
}

export function formatKrwPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export function formatKrwPriceFrom(price: number): string {
  return `${price.toLocaleString('ko-KR')}원~`;
}

const PRICE_DAY_TYPE_ORDER: Record<StorePriceDayType, number> = {
  WEEKDAY: 0,
  WEEKEND: 1,
  ALL: 2,
};

export type StorePriceSlotLike = {
  dayType: StorePriceDayType;
  startTime: string;
  endTime: string;
  price: number;
  label?: string | null;
  sortOrder?: number;
};

export function sortStorePriceSlots<T extends StorePriceSlotLike>(slots: T[]): T[] {
  return [...slots].sort((a, b) => {
    const dayDiff = PRICE_DAY_TYPE_ORDER[a.dayType] - PRICE_DAY_TYPE_ORDER[b.dayType];
    if (dayDiff !== 0) return dayDiff;
    const sortDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (sortDiff !== 0) return sortDiff;
    return a.startTime.localeCompare(b.startTime);
  });
}

export function computeStoreMinPrice(slots: StorePriceSlotLike[]): number | null {
  if (slots.length === 0) return null;
  return Math.min(...slots.map((slot) => slot.price));
}

export function buildStoreFacilitySummary(input: {
  screenBrand: StoreScreenBrand;
  screenBrandOther?: string | null;
  screenModel?: string | null;
  roomCount?: number | null;
  parkingAvailable?: boolean | null;
  parkingNote?: string | null;
  leftHandedAvailable?: boolean | null;
  unmanned?: boolean | null;
}): string[] {
  const lines: string[] = [];
  const brand = formatStoreScreenBrandLabel(input.screenBrand, input.screenBrandOther);
  const model = input.screenModel?.trim();
  if (model) {
    lines.push(`${brand} ${model}`);
  } else if (input.screenBrand !== 'OTHER') {
    lines.push(brand);
  }
  if (input.roomCount && input.roomCount > 0) {
    lines.push(`${input.roomCount}룸`);
  }
  if (input.parkingAvailable) {
    lines.push(input.parkingNote?.trim() ? `주차 가능 · ${input.parkingNote.trim()}` : '주차 가능');
  }
  if (input.leftHandedAvailable) {
    lines.push('좌타석');
  }
  if (input.unmanned) {
    lines.push('무인 운영');
  }
  return lines;
}
