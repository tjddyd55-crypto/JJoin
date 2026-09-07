import { JOIN_MEMBER_MAX_AGE, JOIN_MEMBER_MIN_AGE } from './join-member-preferences';

export { JOIN_MEMBER_MIN_AGE as MEMBER_AGE_MIN, JOIN_MEMBER_MAX_AGE as MEMBER_AGE_MAX };

export type AgeRangeValue = {
  minAge: number | null;
  maxAge: number | null;
};

export function clampMemberAge(value: number, min = JOIN_MEMBER_MIN_AGE, max = JOIN_MEMBER_MAX_AGE): number {
  return Math.min(max, Math.max(min, value));
}

export function isUnrestrictedAgeRange(value: AgeRangeValue): boolean {
  return value.minAge == null && value.maxAge == null;
}

export function normalizeAgeRange(
  value: AgeRangeValue,
  bounds: { min: number; max: number } = {
    min: JOIN_MEMBER_MIN_AGE,
    max: JOIN_MEMBER_MAX_AGE,
  },
): AgeRangeValue {
  if (isUnrestrictedAgeRange(value)) {
    return { minAge: null, maxAge: null };
  }

  const minAge = clampMemberAge(value.minAge ?? bounds.min, bounds.min, bounds.max);
  const maxAge = clampMemberAge(value.maxAge ?? bounds.max, bounds.min, bounds.max);
  if (minAge > maxAge) {
    return { minAge: maxAge, maxAge: minAge };
  }
  return { minAge, maxAge };
}

export function validateMemberAgeRange(
  value: AgeRangeValue,
  bounds: { min: number; max: number } = {
    min: JOIN_MEMBER_MIN_AGE,
    max: JOIN_MEMBER_MAX_AGE,
  },
): { ok: true } | { ok: false; code: string } {
  const { minAge, maxAge } = value;
  if (minAge == null && maxAge == null) return { ok: true };
  if (minAge == null || maxAge == null) {
    return { ok: false, code: 'incomplete_age_range' };
  }
  if (minAge < bounds.min || minAge > bounds.max) return { ok: false, code: 'invalid_min_age' };
  if (maxAge < bounds.min || maxAge > bounds.max) return { ok: false, code: 'invalid_max_age' };
  if (minAge > maxAge) return { ok: false, code: 'invalid_age_range' };
  return { ok: true };
}

/** User-facing age range label — decade shorthand 금지. */
export function formatAgeRangeLabel(minAge: number | null, maxAge: number | null): string {
  if (minAge != null && maxAge != null) return `${minAge}세 ~ ${maxAge}세`;
  if (minAge != null) return `${minAge}세 이상`;
  if (maxAge != null) return `${maxAge}세 이하`;
  return '연령 무관';
}

export function ageToTrackRatio(
  age: number,
  bounds: { min: number; max: number } = {
    min: JOIN_MEMBER_MIN_AGE,
    max: JOIN_MEMBER_MAX_AGE,
  },
): number {
  if (bounds.max <= bounds.min) return 0;
  return (clampMemberAge(age, bounds.min, bounds.max) - bounds.min) / (bounds.max - bounds.min);
}

export function trackRatioToAge(
  ratio: number,
  bounds: { min: number; max: number } = {
    min: JOIN_MEMBER_MIN_AGE,
    max: JOIN_MEMBER_MAX_AGE,
  },
): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.round(bounds.min + clamped * (bounds.max - bounds.min));
}
