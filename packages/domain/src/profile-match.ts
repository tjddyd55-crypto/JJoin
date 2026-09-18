/**
 * Profile-condition matching — separate from join-room (time/region) alerts.
 * Matches a host public profile against a subscriber preference.
 */

import type { DrinkingHabit, SmokingHabit } from './profile-lifestyle';

export type ProfileMatchPreferredGender = 'ANY' | 'MALE' | 'FEMALE';

export type ProfileMatchPreferenceInput = {
  enabled: boolean;
  preferredGender: ProfileMatchPreferredGender;
  minAge: number | null;
  maxAge: number | null;
  minFieldHandicap: number | null;
  maxFieldHandicap: number | null;
  minScreenHandicap: number | null;
  maxScreenHandicap: number | null;
  drinkingHabits: DrinkingHabit[];
  smokingHabits: SmokingHabit[];
  sido: string | null;
  sigungu: string | null;
};

export type ProfileMatchCandidate = {
  gender: string | null;
  age: number | null;
  fieldHandicap: number | null;
  screenHandicap: number | null;
  drinking: DrinkingHabit | null;
  smoking: SmokingHabit | null;
  sido: string | null;
  sigungu: string | null;
};

export function validateProfileMatchPreference(
  input: ProfileMatchPreferenceInput,
): { ok: true } | { ok: false; code: string } {
  if (!['ANY', 'MALE', 'FEMALE'].includes(input.preferredGender)) {
    return { ok: false, code: 'invalid_preferred_gender' };
  }
  if (input.minAge != null && input.maxAge != null && input.minAge > input.maxAge) {
    return { ok: false, code: 'invalid_age_range' };
  }
  if (
    input.minFieldHandicap != null &&
    input.maxFieldHandicap != null &&
    input.minFieldHandicap > input.maxFieldHandicap
  ) {
    return { ok: false, code: 'invalid_field_handicap_range' };
  }
  if (
    input.minScreenHandicap != null &&
    input.maxScreenHandicap != null &&
    input.minScreenHandicap > input.maxScreenHandicap
  ) {
    return { ok: false, code: 'invalid_screen_handicap_range' };
  }
  return { ok: true };
}

function inInclusiveRange(
  value: number | null,
  min: number | null,
  max: number | null,
): boolean {
  if (min == null && max == null) return true;
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function matchesOptionalEnumList<T extends string>(
  value: T | null,
  allowed: T[],
): boolean {
  if (allowed.length === 0) return true;
  if (value == null) return false;
  return allowed.includes(value);
}

export function matchesProfileMatchPreference(
  preference: ProfileMatchPreferenceInput,
  candidate: ProfileMatchCandidate,
): boolean {
  if (!preference.enabled) return false;

  if (preference.preferredGender !== 'ANY') {
    if (candidate.gender !== preference.preferredGender) return false;
  }

  if (!inInclusiveRange(candidate.age, preference.minAge, preference.maxAge)) {
    return false;
  }
  if (
    !inInclusiveRange(
      candidate.fieldHandicap,
      preference.minFieldHandicap,
      preference.maxFieldHandicap,
    )
  ) {
    return false;
  }
  if (
    !inInclusiveRange(
      candidate.screenHandicap,
      preference.minScreenHandicap,
      preference.maxScreenHandicap,
    )
  ) {
    return false;
  }
  if (!matchesOptionalEnumList(candidate.drinking, preference.drinkingHabits)) {
    return false;
  }
  if (!matchesOptionalEnumList(candidate.smoking, preference.smokingHabits)) {
    return false;
  }

  if (preference.sido) {
    if (candidate.sido !== preference.sido) return false;
    if (preference.sigungu && candidate.sigungu !== preference.sigungu) return false;
  }

  return true;
}

export function profileMatchNotificationEventKey(params: {
  subscriberUserId: string;
  joinId: string;
}): string {
  return `profile-match-join:${params.subscriberUserId}:${params.joinId}`;
}
