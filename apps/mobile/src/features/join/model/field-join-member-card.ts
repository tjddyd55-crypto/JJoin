import {
  calculateParticipationTrust,
  formatFieldHandicap,
  formatScreenHandicap,
  mapGenderDisplay,
} from '@jjoin/domain';
import type { JoinParticipantDto } from '@jjoin/types';

export type FieldJoinMemberCardRole = '방장' | '참가자';

export type FieldJoinMemberCardModel = {
  participantId: string;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  roleBadge: FieldJoinMemberCardRole;
  identityLine: string | null;
  ageLabel: string | null;
  genderLabel: string | null;
  fieldSkillLabel: string | null;
  screenSkillLabel: string | null;
  participationLabel: string | null;
  attendanceLabel: string | null;
  trustLabel: string | null;
  metrics: string[];
  applicationNote: string | null;
  conditionHint: string | null;
  faceLabel: string | null;
};

const AGE_BAND_LABEL: Record<string, string> = {
  TEENS: '10대',
  TWENTIES: '20대',
  THIRTIES: '30대',
  FORTIES: '40대',
  FIFTIES_PLUS: '50대 이상',
};

export function formatFieldJoinMemberAgeLabel(
  age?: number | null,
  ageBand?: string | null,
): string | null {
  if (age != null && Number.isFinite(age)) return `${age}세`;
  if (!ageBand) return null;
  return AGE_BAND_LABEL[ageBand] ?? null;
}

export function formatFieldJoinMemberTrustLabel(participant: {
  completedJoinCount?: number | null;
  noShowCount?: number | null;
}): string | null {
  const completed = participant.completedJoinCount ?? 0;
  const noShow = participant.noShowCount ?? 0;
  if (completed + noShow === 0) return null;
  return calculateParticipationTrust({
    joinedCount: completed + noShow,
    attendedCount: completed,
    noShowCount: noShow,
  }).labelText;
}

function compactMetrics(labels: Array<string | null>): string[] {
  return labels.filter((label): label is string => Boolean(label));
}

/**
 * FIELD profile-card view-model.
 * Reuses existing join/public profile fields only — no invented career years or birthdate.
 */
export function buildFieldJoinMemberCardModel(
  participant: JoinParticipantDto,
): FieldJoinMemberCardModel {
  const ageLabel = formatFieldJoinMemberAgeLabel(participant.age, participant.ageBand);
  const genderLabel = mapGenderDisplay(participant.gender) ?? null;
  const identityLine = [ageLabel, genderLabel].filter(Boolean).join(' · ') || null;
  const fieldSkillLabel = formatFieldHandicap(participant.fieldHandicap ?? null);
  const screenSkillLabel = formatScreenHandicap(participant.screenHandicap ?? null);
  const participationLabel =
    participant.completedJoinCount != null ? `참석 ${participant.completedJoinCount}회` : null;
  const attendanceLabel =
    participant.attendanceRatePercent != null
      ? `출석 ${participant.attendanceRatePercent}%`
      : null;
  const trustLabel = formatFieldJoinMemberTrustLabel(participant);

  return {
    participantId: participant.participantId,
    userId: participant.userId,
    nickname: participant.nickname,
    avatarUrl: participant.avatarUrl ?? null,
    roleBadge: participant.role === 'HOST' ? '방장' : '참가자',
    identityLine,
    ageLabel,
    genderLabel,
    fieldSkillLabel,
    screenSkillLabel,
    participationLabel,
    attendanceLabel,
    trustLabel,
    metrics: compactMetrics([
      fieldSkillLabel,
      screenSkillLabel,
      participationLabel,
      attendanceLabel,
      trustLabel,
    ]),
    applicationNote: participant.applicationNote?.trim() || null,
    conditionHint: participant.fieldGenderHint ?? null,
    faceLabel: participant.fieldFaceLabel ?? null,
  };
}
