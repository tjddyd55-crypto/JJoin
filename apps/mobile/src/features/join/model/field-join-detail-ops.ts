import {
  countFieldConfirmedApplicants,
  plannedPlayerCountToRecruitCount,
} from '@jjoin/domain';
import type { JoinDetailDto, JoinParticipantDto } from '@jjoin/types';

export const FIELD_JOIN_DETAIL_OPS_ORDER = [
  'header',
  'round_info',
  'recruit_conditions',
  'participant_benefits',
  'host_memo',
  'confirmed_members',
  'applicants',
  'host_management',
  'chat',
  'sticky_cta',
] as const;

export type FieldJoinDetailOpsSection = (typeof FIELD_JOIN_DETAIL_OPS_ORDER)[number];

export function isFieldJoinDetail(detail: Pick<JoinDetailDto, 'venue'>): boolean {
  return detail.venue.venueType === 'FIELD';
}

export function shouldShowJoinTeamAssignmentSection(detail: {
  venue: { venueType?: string | null };
  playFormat?: string | null;
  teamCount?: number | null;
}): boolean {
  if (detail.venue.venueType === 'FIELD') return false;
  return detail.playFormat === 'TEAM' && (detail.teamCount ?? 0) >= 2;
}

export function shouldShowJoinUrgentRecruitToggle(input: {
  venueType?: string | null;
  isHost: boolean;
  canManage: boolean;
}): boolean {
  return input.venueType !== 'FIELD' && input.isHost && input.canManage;
}

export function listFieldConfirmedMembers(
  participants: JoinParticipantDto[],
): JoinParticipantDto[] {
  return participants.filter(
    (participant) =>
      participant.role === 'HOST' ||
      participant.participationStatus === 'APPROVED' ||
      participant.participationStatus === 'CONFIRMED' ||
      participant.participationStatus === 'COMPLETED',
  );
}

export function listFieldApplicants(participants: JoinParticipantDto[]): JoinParticipantDto[] {
  return participants.filter(
    (participant) =>
      participant.role !== 'HOST' && participant.participationStatus === 'APPLIED',
  );
}

export function formatFieldConfirmedMemberSectionTitle(input: {
  recruitCount?: number | null;
  plannedPlayerCount?: number | null;
  participants: Array<{
    role: string;
    participationStatus: string;
    hostReviewStatus?: string | null;
  }>;
}): string {
  const recruitCount =
    input.recruitCount ??
    (input.plannedPlayerCount != null
      ? plannedPlayerCountToRecruitCount(input.plannedPlayerCount)
      : null);
  const confirmedApplicantCount = countFieldConfirmedApplicants(input.participants);
  if (recruitCount != null && recruitCount > 0) {
    return `모집 ${recruitCount}명 중 ${confirmedApplicantCount}명 확정`;
  }
  return `확정 멤버 ${confirmedApplicantCount}명`;
}

export const FIELD_APPLY_NOTE_STICKY_EXTRA = 88;

export function resolveFieldDetailStickyScrollExtra(input: {
  showApplyNote: boolean;
  showSecondaryCta: boolean;
  secondaryButtonExtra: number;
}): number {
  let extra = 0;
  if (input.showApplyNote) extra += FIELD_APPLY_NOTE_STICKY_EXTRA;
  if (input.showSecondaryCta) extra += input.secondaryButtonExtra;
  return extra;
}
