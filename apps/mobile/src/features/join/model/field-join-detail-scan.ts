import {
  formatAgeRangeLabel,
  formatFieldGreenFeeLabel,
  formatFieldCoinBenefitLabel,
  formatStandardGenderCompositionLabel,
  plannedPlayerCountToRecruitCount,
  selectedFieldKrwBenefitLabels,
  normalizeFieldJoinBenefits,
} from '@jjoin/domain';
import type { JoinDetailDto } from '@jjoin/types';
import {
  formatJoinScheduleDetailDate,
  formatJoinScheduleDetailTime,
} from '../../../ui/join-display';

export type FieldJoinScanRow = { label: string; value: string };

const FIELD_SCAN_LABELS = [
  '골프장',
  '날짜',
  '티타임',
  '그린피',
  '모집',
  '성별',
  '나이',
  '혜택',
  '코인',
  '방장 메모',
] as const;

export function fieldJoinScanLabels(): readonly string[] {
  return FIELD_SCAN_LABELS;
}

function fieldGenderScanValue(detail: JoinDetailDto): string {
  return (
    formatStandardGenderCompositionLabel(
      detail.targetMaleCount ?? null,
      detail.targetFemaleCount ?? null,
    ) ?? '무관'
  );
}

function fieldBenefitScanValue(detail: JoinDetailDto): string {
  const labels = selectedFieldKrwBenefitLabels(
    normalizeFieldJoinBenefits(detail.fieldDetails),
  );
  return labels.length > 0 ? labels.join(' · ') : '없음';
}

function fieldCoinScanValue(detail: JoinDetailDto): string {
  return formatFieldCoinBenefitLabel(detail.rewardPerParticipant) ?? '없음';
}

/**
 * FIELD detail must be scannable in ~5 seconds.
 * Core first: course, date/tee, green fee, recruit, gender/age, benefits, Coin, memo.
 */
export function buildFieldJoinScanRows(detail: JoinDetailDto): FieldJoinScanRow[] {
  const recruitCount =
    detail.recruitCount ?? plannedPlayerCountToRecruitCount(detail.plannedPlayerCount);
  const memo = detail.description?.trim() || '없음';

  return [
    { label: '골프장', value: detail.venue.name },
    { label: '날짜', value: formatJoinScheduleDetailDate(detail.startAt) },
    { label: '티타임', value: formatJoinScheduleDetailTime(detail.startAt) },
    {
      label: '그린피',
      value: formatFieldGreenFeeLabel(detail.fieldDetails?.greenFeePerPerson) ?? '미입력',
    },
    { label: '모집', value: `${recruitCount}명` },
    { label: '성별', value: fieldGenderScanValue(detail) },
    { label: '나이', value: formatAgeRangeLabel(detail.minAge ?? null, detail.maxAge ?? null) },
    { label: '혜택', value: fieldBenefitScanValue(detail) },
    { label: '코인', value: fieldCoinScanValue(detail) },
    { label: '방장 메모', value: memo },
  ];
}
