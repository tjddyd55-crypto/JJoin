/**
 * FIELD recruit / host-selection SSOT.
 * User-facing size is recruitCount (1/2/3). Host is counted separately.
 * Applications are unlimited; recruitCount limits confirmed applicants only.
 */

import type { MatchingGender } from './store-matching';

export const FIELD_ALLOWED_RECRUIT_COUNTS = [1, 2, 3] as const;
export type FieldRecruitCount = (typeof FIELD_ALLOWED_RECRUIT_COUNTS)[number];

export const FIELD_HOST_SEAT_COUNT = 1;
export const FIELD_MAX_PARTY_SIZE = 4;
export const FIELD_APPLICATION_NOTE_MAX = 80;

export const FIELD_HOST_REVIEW_STATUSES = ['ON_HOLD', 'REJECTED'] as const;
export type FieldHostReviewStatus = (typeof FIELD_HOST_REVIEW_STATUSES)[number];

export const FIELD_CONFIRMED_APPLICANT_STATUSES = ['APPROVED', 'CONFIRMED', 'COMPLETED'] as const;
export const FIELD_ACTIVE_APPLICATION_STATUSES = [
  'APPLIED',
  'APPROVED',
  'CONFIRMED',
  'COMPLETED',
] as const;

export type FieldParticipationFaceLabel =
  | '신청'
  | '확정'
  | '보류'
  | '미선정'
  | '신청 취소';

export type FieldGenderConfirmHint =
  | '조건 일치'
  | '남성 자리 남음'
  | '여성 자리 남음'
  | '해당 성별 자리 마감';

export type FieldRecruitParticipant = {
  role: string;
  participationStatus: string;
  hostReviewStatus?: string | null;
  gender?: MatchingGender | null;
};

export function isFieldRecruitCount(value: number): value is FieldRecruitCount {
  return FIELD_ALLOWED_RECRUIT_COUNTS.includes(value as FieldRecruitCount);
}

export function recruitCountToPlannedPlayerCount(recruitCount: number): number {
  return recruitCount + FIELD_HOST_SEAT_COUNT;
}

export function plannedPlayerCountToRecruitCount(plannedPlayerCount: number): number {
  return Math.max(0, plannedPlayerCount - FIELD_HOST_SEAT_COUNT);
}

export function validateFieldRecruitCount(
  recruitCount: number,
): { ok: true; value: FieldRecruitCount } | { ok: false; code: string } {
  if (!Number.isInteger(recruitCount) || !isFieldRecruitCount(recruitCount)) {
    return { ok: false, code: 'field_recruit_count_not_allowed' };
  }
  return { ok: true, value: recruitCount };
}

export function resolveFieldRecruitCount(input: {
  recruitCount?: number | null;
  plannedPlayerCount?: number | null;
}): { ok: true; recruitCount: FieldRecruitCount; plannedPlayerCount: number } | { ok: false; code: string } {
  if (input.recruitCount != null) {
    const recruit = validateFieldRecruitCount(input.recruitCount);
    if (!recruit.ok) return recruit;
    return {
      ok: true,
      recruitCount: recruit.value,
      plannedPlayerCount: recruitCountToPlannedPlayerCount(recruit.value),
    };
  }
  if (input.plannedPlayerCount != null) {
    const recruitCount = plannedPlayerCountToRecruitCount(input.plannedPlayerCount);
    const recruit = validateFieldRecruitCount(recruitCount);
    if (!recruit.ok) return recruit;
    return {
      ok: true,
      recruitCount: recruit.value,
      plannedPlayerCount: recruitCountToPlannedPlayerCount(recruit.value),
    };
  }
  return { ok: false, code: 'field_recruit_count_required' };
}

export function isFieldHostParticipant(participant: { role: string }): boolean {
  return participant.role === 'HOST';
}

export function isFieldUserCancelled(participant: FieldRecruitParticipant): boolean {
  return (
    participant.participationStatus === 'CANCELLED' &&
    participant.hostReviewStatus !== 'REJECTED'
  );
}

export function isFieldRejectedApplicant(
  participant: Pick<FieldRecruitParticipant, 'participationStatus' | 'hostReviewStatus'>,
): boolean {
  return (
    participant.hostReviewStatus === 'REJECTED' ||
    (participant.participationStatus === 'CANCELLED' &&
      participant.hostReviewStatus === 'REJECTED')
  );
}

export function isFieldOnHoldApplicant(participant: Pick<FieldRecruitParticipant, 'participationStatus' | 'hostReviewStatus'>): boolean {
  return (
    participant.participationStatus === 'APPLIED' &&
    participant.hostReviewStatus === 'ON_HOLD'
  );
}

export function isFieldConfirmedApplicant(participant: FieldRecruitParticipant): boolean {
  return (
    !isFieldHostParticipant(participant) &&
    FIELD_CONFIRMED_APPLICANT_STATUSES.includes(
      participant.participationStatus as (typeof FIELD_CONFIRMED_APPLICANT_STATUSES)[number],
    )
  );
}

export function isFieldCountedApplication(participant: FieldRecruitParticipant): boolean {
  if (isFieldHostParticipant(participant)) return false;
  if (isFieldUserCancelled(participant)) return false;
  return true;
}

export function countFieldApplications(participants: FieldRecruitParticipant[]): number {
  return participants.filter(isFieldCountedApplication).length;
}

export function countFieldConfirmedApplicants(participants: FieldRecruitParticipant[]): number {
  return participants.filter(isFieldConfirmedApplicant).length;
}

export function countFieldConfirmedApplicantsByGender(
  participants: FieldRecruitParticipant[],
  gender: MatchingGender,
): number {
  return participants.filter(
    (p) => isFieldConfirmedApplicant(p) && p.gender === gender,
  ).length;
}

export function validateFieldGenderRecruit(params: {
  recruitCount: number;
  mode?: 'ANY' | 'FIXED' | null;
  maleRecruitCount?: number | null;
  femaleRecruitCount?: number | null;
}):
  | { ok: true; mode: 'ANY' | 'FIXED'; maleRecruitCount: number | null; femaleRecruitCount: number | null }
  | { ok: false; code: string } {
  const recruit = validateFieldRecruitCount(params.recruitCount);
  if (!recruit.ok) return recruit;

  const mode =
    params.mode ??
    (params.maleRecruitCount != null && params.femaleRecruitCount != null ? 'FIXED' : 'ANY');

  if (mode === 'ANY') {
    return { ok: true, mode: 'ANY', maleRecruitCount: null, femaleRecruitCount: null };
  }

  const male = params.maleRecruitCount;
  const female = params.femaleRecruitCount;
  if (
    male == null ||
    female == null ||
    !Number.isInteger(male) ||
    !Number.isInteger(female) ||
    male < 0 ||
    female < 0
  ) {
    return { ok: false, code: 'invalid_field_gender_recruit' };
  }
  if (male + female !== recruit.value) {
    return { ok: false, code: 'field_gender_recruit_sum_mismatch' };
  }
  return { ok: true, mode: 'FIXED', maleRecruitCount: male, femaleRecruitCount: female };
}

export function canCancelFieldParticipation(params: {
  role?: string | null;
  participationStatus: string;
}): { ok: true } | { ok: false; code: string } {
  if (params.role === 'HOST') return { ok: false, code: 'cannot_cancel_host' };
  if (
    params.participationStatus === 'APPLIED' ||
    params.participationStatus === 'APPROVED' ||
    params.participationStatus === 'CONFIRMED'
  ) {
    return { ok: true };
  }
  if (params.participationStatus === 'CANCELLED') return { ok: true };
  return { ok: false, code: 'invalid_participant_status' };
}

export function canApplyToFieldJoin(params: {
  applicationsClosed?: boolean | null;
  joinStatus?: string | null;
  alreadyApplied?: boolean;
}): { ok: true } | { ok: false; code: string } {
  if (params.joinStatus === 'CANCELLED' || params.joinStatus === 'COMPLETED') {
    return { ok: false, code: 'join_not_joinable' };
  }
  if (params.applicationsClosed === true) {
    return { ok: false, code: 'field_applications_closed' };
  }
  if (params.alreadyApplied) {
    return { ok: false, code: 'already_applied' };
  }
  return { ok: true };
}

export function canConfirmFieldApplicant(params: {
  recruitCount: number;
  applicantStatus: string;
  applicantHostReview?: string | null;
  applicantGender?: MatchingGender | null;
  genderMode?: 'ANY' | 'FIXED' | null;
  maleRecruitCount?: number | null;
  femaleRecruitCount?: number | null;
  participants: FieldRecruitParticipant[];
}): { ok: true } | { ok: false; code: string } {
  const recruit = validateFieldRecruitCount(params.recruitCount);
  if (!recruit.ok) return recruit;

  if (params.applicantStatus === 'APPROVED' || params.applicantStatus === 'CONFIRMED') {
    return { ok: true };
  }
  if (params.applicantStatus !== 'APPLIED') {
    return { ok: false, code: 'invalid_participant_status' };
  }
  void params.applicantHostReview;

  const confirmed = countFieldConfirmedApplicants(params.participants);
  if (confirmed >= recruit.value) {
    return { ok: false, code: 'field_recruit_full' };
  }

  const gender = validateFieldGenderRecruit({
    recruitCount: recruit.value,
    mode: params.genderMode,
    maleRecruitCount: params.maleRecruitCount,
    femaleRecruitCount: params.femaleRecruitCount,
  });
  if (!gender.ok) return gender;
  if (gender.mode === 'ANY') return { ok: true };

  if (params.applicantGender !== 'MALE' && params.applicantGender !== 'FEMALE') {
    return { ok: false, code: 'GENDER_REQUIRED' };
  }
  const used = countFieldConfirmedApplicantsByGender(params.participants, params.applicantGender);
  const cap =
    params.applicantGender === 'MALE'
      ? (gender.maleRecruitCount ?? 0)
      : (gender.femaleRecruitCount ?? 0);
  if (used >= cap) {
    return { ok: false, code: 'GENDER_SLOT_FULL' };
  }
  return { ok: true };
}

export function fieldGenderConfirmHint(params: {
  applicantGender?: MatchingGender | null;
  recruitCount: number;
  genderMode?: 'ANY' | 'FIXED' | null;
  maleRecruitCount?: number | null;
  femaleRecruitCount?: number | null;
  participants: FieldRecruitParticipant[];
}): FieldGenderConfirmHint {
  const gender = validateFieldGenderRecruit({
    recruitCount: params.recruitCount,
    mode: params.genderMode,
    maleRecruitCount: params.maleRecruitCount,
    femaleRecruitCount: params.femaleRecruitCount,
  });
  if (!gender.ok || gender.mode === 'ANY') return '조건 일치';

  const maleUsed = countFieldConfirmedApplicantsByGender(params.participants, 'MALE');
  const femaleUsed = countFieldConfirmedApplicantsByGender(params.participants, 'FEMALE');
  const maleLeft = Math.max(0, (gender.maleRecruitCount ?? 0) - maleUsed);
  const femaleLeft = Math.max(0, (gender.femaleRecruitCount ?? 0) - femaleUsed);

  if (params.applicantGender === 'MALE') {
    return maleLeft > 0 ? '남성 자리 남음' : '해당 성별 자리 마감';
  }
  if (params.applicantGender === 'FEMALE') {
    return femaleLeft > 0 ? '여성 자리 남음' : '해당 성별 자리 마감';
  }
  if (maleLeft > 0 && femaleLeft === 0) return '남성 자리 남음';
  if (femaleLeft > 0 && maleLeft === 0) return '여성 자리 남음';
  return '조건 일치';
}

export function mapFieldParticipationFaceLabel(params: {
  role?: string;
  participationStatus: string;
  hostReviewStatus?: string | null;
}): FieldParticipationFaceLabel {
  if (params.role === 'HOST') return '확정';
  if (isFieldOnHoldApplicant(params)) return '보류';
  if (isFieldRejectedApplicant(params)) return '미선정';
  if (params.participationStatus === 'CANCELLED') return '신청 취소';
  if (FIELD_CONFIRMED_APPLICANT_STATUSES.includes(
    params.participationStatus as (typeof FIELD_CONFIRMED_APPLICANT_STATUSES)[number],
  )) {
    return '확정';
  }
  return '신청';
}

export function validateFieldApplicationNote(
  note: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; code: string } {
  if (note == null) return { ok: true, value: null };
  const trimmed = note.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > FIELD_APPLICATION_NOTE_MAX) {
    return { ok: false, code: 'field_application_note_too_long' };
  }
  return { ok: true, value: trimmed };
}

export function formatFieldRecruitSummary(params: {
  recruitCount: number;
  applicationCount: number;
  confirmedCount: number;
}): string {
  return `모집 ${params.recruitCount} · 신청 ${params.applicationCount} · 확정 ${params.confirmedCount}`;
}
