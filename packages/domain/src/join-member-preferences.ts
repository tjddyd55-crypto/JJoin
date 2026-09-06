import { JoinPreferredGender } from '@jjoin/types';

export const JOIN_MEMBER_MIN_AGE = 18;
export const JOIN_MEMBER_MAX_AGE = 70;

export type JoinMemberPreferenceInput = {
  preferredGender?: JoinPreferredGender | null;
  minAge?: number | null;
  maxAge?: number | null;
};

export function validateJoinMemberPreferences(
  input: JoinMemberPreferenceInput,
): { ok: true } | { ok: false; code: string } {
  const minAge = input.minAge ?? null;
  const maxAge = input.maxAge ?? null;

  if (minAge != null && (minAge < JOIN_MEMBER_MIN_AGE || minAge > JOIN_MEMBER_MAX_AGE)) {
    return { ok: false, code: 'invalid_min_age' };
  }
  if (maxAge != null && (maxAge < JOIN_MEMBER_MIN_AGE || maxAge > JOIN_MEMBER_MAX_AGE)) {
    return { ok: false, code: 'invalid_max_age' };
  }
  if (minAge != null && maxAge != null && minAge > maxAge) {
    return { ok: false, code: 'invalid_age_range' };
  }

  if (
    input.preferredGender != null &&
    input.preferredGender !== JoinPreferredGender.ANY &&
    input.preferredGender !== JoinPreferredGender.MALE &&
    input.preferredGender !== JoinPreferredGender.FEMALE
  ) {
    return { ok: false, code: 'invalid_preferred_gender' };
  }

  return { ok: true };
}

export function formatJoinMemberPreferenceSummary(input: JoinMemberPreferenceInput): string[] {
  const lines: string[] = [];
  if (input.preferredGender === JoinPreferredGender.MALE) lines.push('남성');
  else if (input.preferredGender === JoinPreferredGender.FEMALE) lines.push('여성');

  if (input.minAge != null && input.maxAge != null) {
    lines.push(`${input.minAge}세~${input.maxAge}세`);
  } else if (input.minAge != null) {
    lines.push(`${input.minAge}세 이상`);
  } else if (input.maxAge != null) {
    lines.push(`${input.maxAge}세 이하`);
  }

  return lines;
}

export function hasJoinMemberPreferences(input: JoinMemberPreferenceInput): boolean {
  return (
    (input.preferredGender != null && input.preferredGender !== JoinPreferredGender.ANY) ||
    input.minAge != null ||
    input.maxAge != null
  );
}
