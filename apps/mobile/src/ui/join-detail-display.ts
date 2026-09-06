import { formatMatchingDeadlineHint } from '@jjoin/domain';
import {
  JoinPreferredGender,
  ParticipationStatus,
  type JoinDetailDto,
  type JoinParticipantDto,
} from '@jjoin/types';
import { matchingRewardBenefitLabel } from '../features/store/matching-join-ui';

const ACTIVE_PARTICIPANT_STATUSES: ParticipationStatus[] = [
  ParticipationStatus.APPLIED,
  ParticipationStatus.APPROVED,
  ParticipationStatus.CONFIRMED,
  ParticipationStatus.COMPLETED,
];

export function filterJoinDisplayParticipants(
  participants: JoinParticipantDto[],
): JoinParticipantDto[] {
  return participants.filter(
    (p) =>
      p.role !== 'HOST' &&
      ACTIVE_PARTICIPANT_STATUSES.includes(p.participationStatus),
  );
}

export function formatParticipantGenderLabel(
  gender: JoinParticipantDto['gender'],
): string | null {
  switch (gender) {
    case 'MALE':
      return '남성';
    case 'FEMALE':
      return '여성';
    default:
      return null;
  }
}

export function formatParticipationStatusLabel(status: ParticipationStatus): string {
  switch (status) {
    case ParticipationStatus.APPLIED:
      return '신청 중';
    case ParticipationStatus.APPROVED:
    case ParticipationStatus.CONFIRMED:
      return '참가 확정';
    case ParticipationStatus.COMPLETED:
      return '참가 완료';
    default:
      return '';
  }
}

export type JoinStatTile = {
  label: string;
  value: string;
  surface?: 'info' | 'success';
};

export function buildJoinRecruitmentStatTiles(
  detail: JoinDetailDto,
  now = new Date(),
): JoinStatTile[] {
  const breakdown = buildJoinRecruitmentBreakdown(detail, now);
  const male = breakdown.maleTarget ?? 0;
  const female = breakdown.femaleTarget ?? 0;
  const minimum = breakdown.minimumPlayers ?? 0;

  return [
    { label: '총 모집', value: `${detail.plannedPlayerCount}명`, surface: 'info' },
    { label: '남성', value: male > 0 ? `${male}명` : '—', surface: 'info' },
    { label: '여성', value: female > 0 ? `${female}명` : '—', surface: 'success' },
    {
      label: '최소 확정',
      value: minimum > 0 ? `${minimum}명` : '—',
      surface: 'success',
    },
  ];
}

export function buildJoinParticipationStatTiles(detail: JoinDetailDto): JoinStatTile[] {
  const summary = buildJoinParticipationSummary(detail);
  const tiles: JoinStatTile[] = [];
  if (summary.maleLine) {
    tiles.push({
      label: '남성',
      value: summary.maleLine.replace('남성 ', ''),
      surface: 'info',
    });
  }
  if (summary.femaleLine) {
    tiles.push({
      label: '여성',
      value: summary.femaleLine.replace('여성 ', ''),
      surface: 'success',
    });
  }
  return tiles;
}

export type JoinRecruitmentBreakdown = {
  totalLabel: string;
  maleTarget: number | null;
  femaleTarget: number | null;
  minimumPlayers: number | null;
  recruitCloseLabel: string | null;
};

export function buildJoinRecruitmentBreakdown(
  detail: JoinDetailDto,
  now = new Date(),
): JoinRecruitmentBreakdown {
  const recruitCloseLabel = detail.recruitClosesAt
    ? formatMatchingDeadlineHint(new Date(detail.recruitClosesAt), now)
    : null;

  return {
    totalLabel: `총 ${detail.plannedPlayerCount}명 모집`,
    maleTarget: detail.targetMaleCount ?? null,
    femaleTarget: detail.targetFemaleCount ?? null,
    minimumPlayers: detail.minimumPlayers ?? null,
    recruitCloseLabel,
  };
}

export type JoinParticipationSummary = {
  headline: string;
  maleLine: string | null;
  femaleLine: string | null;
  seatsLeftLabel: string;
  seatsHighlightTone: 'available' | 'lastSeat' | 'full';
};

export function buildJoinParticipationSummary(detail: JoinDetailDto): JoinParticipationSummary {
  const maleTarget = detail.targetMaleCount ?? 0;
  const femaleTarget = detail.targetFemaleCount ?? 0;
  const maleConfirmed = detail.confirmedMaleCount ?? 0;
  const femaleConfirmed = detail.confirmedFemaleCount ?? 0;
  const seatsLeft = detail.availableSlots;
  const seatsHighlightTone =
    seatsLeft <= 0 ? 'full' : seatsLeft === 1 ? 'lastSeat' : 'available';

  return {
    headline: `현재 ${detail.confirmedPlayerCount}/${detail.plannedPlayerCount}명 참가`,
    maleLine:
      maleTarget > 0 || femaleTarget > 0 ? `남성 ${maleConfirmed}/${maleTarget}` : null,
    femaleLine:
      maleTarget > 0 || femaleTarget > 0 ? `여성 ${femaleConfirmed}/${femaleTarget}` : null,
    seatsLeftLabel: seatsLeft > 0 ? `${seatsLeft}자리 남음` : '모집 완료',
    seatsHighlightTone,
  };
}

export function buildJoinBenefitLines(detail: JoinDetailDto): string[] {
  const lines: string[] = [];
  const rewardAmount = Number(detail.rewardPerParticipant);
  if (Number.isFinite(rewardAmount) && rewardAmount > 0) {
    lines.push(`참가 완료 시 +${rewardAmount} 코인`);
  }

  const matchingBenefit = matchingRewardBenefitLabel(
    detail.matchingRewardTarget ?? null,
    detail.rewardPerParticipant,
  );
  if (matchingBenefit && !lines.includes(matchingBenefit)) {
    lines.push(matchingBenefit);
  }

  return lines;
}

export function hasJoinBenefits(detail: JoinDetailDto): boolean {
  return buildJoinBenefitLines(detail).length > 0;
}

export function buildJoinMemberPreferenceLabels(detail: JoinDetailDto): string[] {
  const labels: string[] = [];
  if (detail.preferredGender === JoinPreferredGender.MALE) labels.push('남성');
  else if (detail.preferredGender === JoinPreferredGender.FEMALE) labels.push('여성');

  if (detail.minAge != null && detail.maxAge != null) {
    labels.push(`${detail.minAge}세~${detail.maxAge}세`);
  } else if (detail.minAge != null) {
    labels.push(`${detail.minAge}세 이상`);
  } else if (detail.maxAge != null) {
    labels.push(`${detail.maxAge}세 이하`);
  }

  return labels;
}

export function hasJoinMemberPreferenceLabels(detail: JoinDetailDto): boolean {
  return buildJoinMemberPreferenceLabels(detail).length > 0;
}
