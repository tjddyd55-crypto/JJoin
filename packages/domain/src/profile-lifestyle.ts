/**
 * Profile lifestyle + numeric profile fields.
 * Field handicap reuses screen handicap bounds — do not invent a second scale.
 */

import {
  SCREEN_HANDICAP_MAX,
  SCREEN_HANDICAP_MIN,
  validateScreenHandicap,
} from './screen-handicap';

export const DRINKING_HABITS = ['NONE', 'SOMETIMES', 'NORMAL', 'OFTEN'] as const;
export type DrinkingHabit = (typeof DRINKING_HABITS)[number];

export const SMOKING_HABITS = ['NONE', 'CIGARETTE', 'E_CIG', 'BOTH'] as const;
export type SmokingHabit = (typeof SMOKING_HABITS)[number];

export const PROFILE_AGE_MIN = 18;
export const PROFILE_AGE_MAX = 80;
export const PROFILE_HEIGHT_CM_MIN = 120;
export const PROFILE_HEIGHT_CM_MAX = 220;
export const PROFILE_PERSONALITY_MAX = 80;

export const FIELD_HANDICAP_MIN = SCREEN_HANDICAP_MIN;
export const FIELD_HANDICAP_MAX = SCREEN_HANDICAP_MAX;

export type ProfilePrivacyToggles = {
  showAge: boolean;
  showHeight: boolean;
  showDrinking: boolean;
  showSmoking: boolean;
  showHandicap: boolean;
};

export const DEFAULT_PROFILE_PRIVACY: ProfilePrivacyToggles = {
  showAge: true,
  showHeight: true,
  showDrinking: true,
  showSmoking: true,
  showHandicap: true,
};

export function isDrinkingHabit(value: unknown): value is DrinkingHabit {
  return DRINKING_HABITS.includes(value as DrinkingHabit);
}

export function isSmokingHabit(value: unknown): value is SmokingHabit {
  return SMOKING_HABITS.includes(value as SmokingHabit);
}

export function validateOptionalIntRange(
  value: number | null | undefined,
  min: number,
  max: number,
  code: string,
): { ok: true; value: number | null } | { ok: false; code: string } {
  if (value == null) return { ok: true, value: null };
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max) {
    return { ok: false, code };
  }
  return { ok: true, value };
}

export function validateProfileAge(value: number | null | undefined) {
  return validateOptionalIntRange(value, PROFILE_AGE_MIN, PROFILE_AGE_MAX, 'invalid_profile_age');
}

export function validateProfileHeightCm(value: number | null | undefined) {
  return validateOptionalIntRange(
    value,
    PROFILE_HEIGHT_CM_MIN,
    PROFILE_HEIGHT_CM_MAX,
    'invalid_profile_height',
  );
}

export function validateFieldHandicap(value: number | null | undefined) {
  const result = validateScreenHandicap(value);
  if (!result.ok) {
    return { ok: false as const, code: result.code.replace('screen', 'field') };
  }
  return result;
}

export function formatDrinkingHabitLabel(value: DrinkingHabit | null | undefined): string | null {
  switch (value) {
    case 'NONE':
      return '음주 안 함';
    case 'SOMETIMES':
      return '가끔';
    case 'NORMAL':
      return '보통';
    case 'OFTEN':
      return '자주';
    default:
      return null;
  }
}

export function formatSmokingHabitLabel(value: SmokingHabit | null | undefined): string | null {
  switch (value) {
    case 'NONE':
      return '비흡연';
    case 'CIGARETTE':
      return '담배';
    case 'E_CIG':
      return '전자담배';
    case 'BOTH':
      return '담배+전자담배';
    default:
      return null;
  }
}

export function formatFieldHandicap(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return `필드 핸디 ${value}`;
}

export function applyProfilePrivacy<T extends {
  age?: number | null;
  heightCm?: number | null;
  drinking?: DrinkingHabit | null;
  smoking?: SmokingHabit | null;
  fieldHandicap?: number | null;
  screenHandicap?: number | null;
}>(profile: T, privacy: ProfilePrivacyToggles, isOwner: boolean): T {
  if (isOwner) return profile;
  return {
    ...profile,
    age: privacy.showAge ? profile.age : null,
    heightCm: privacy.showHeight ? profile.heightCm : null,
    drinking: privacy.showDrinking ? profile.drinking : null,
    smoking: privacy.showSmoking ? profile.smoking : null,
    fieldHandicap: privacy.showHandicap ? profile.fieldHandicap : null,
    screenHandicap: privacy.showHandicap ? profile.screenHandicap : null,
  };
}

export function resolvePrimaryPhotoId<T extends { id: string; isPrimary?: boolean; sortOrder: number }>(
  photos: T[],
): string | null {
  if (photos.length === 0) return null;
  const primary = photos.find((p) => p.isPrimary);
  if (primary) return primary.id;
  return [...photos].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ?? null;
}
