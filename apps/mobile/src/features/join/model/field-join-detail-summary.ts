import {
  formatAgeRangeLabel,
  formatFieldCourseLocationLine,
  formatFieldCourseShortAddress,
  formatFieldGreenFeeLabel,
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

export const FIELD_DETAIL_SECTION_TITLES = [
  '라운딩 정보',
  '모집 조건',
  '참가자 혜택',
  '방장 메모',
] as const;

export const FIELD_DETAIL_EMPTY_BENEFITS = '제공되는 혜택 없음';
export const FIELD_DETAIL_EMPTY_MEMO = '등록된 메모가 없습니다';
export const FIELD_DETAIL_GENDER_ANY = '성별 무관';
export const FIELD_DETAIL_AGE_ANY = '나이 무관';
export const FIELD_DETAIL_GREEN_FEE_MISSING = '미입력';
export const FIELD_DETAIL_LOCATION_MISSING = '미입력';

export type FieldJoinRoundingInfo = {
  location: string;
  date: string;
  teeTime: string;
  greenFee: string;
};

export type FieldJoinRecruitCondition = {
  count: string;
  gender: string;
  age: string;
};

export type FieldJoinBenefitSummary = {
  selected: string[];
  emptyMessage: string | null;
  coinBadge: string | null;
};

export type FieldJoinMemoSummary = {
  body: string | null;
  emptyMessage: string | null;
};

export type FieldJoinDetailSummary = {
  rounding: FieldJoinRoundingInfo;
  recruit: FieldJoinRecruitCondition;
  benefits: FieldJoinBenefitSummary;
  memo: FieldJoinMemoSummary;
};

function roundingLocation(detail: JoinDetailDto): string {
  return (
    formatFieldCourseLocationLine({
      sido: detail.venue.sido,
      sigungu: detail.venue.sigungu,
    }) ??
    formatFieldCourseShortAddress(detail.venue.address) ??
    FIELD_DETAIL_LOCATION_MISSING
  );
}

function roundingGreenFee(detail: JoinDetailDto): string {
  const labeled = formatFieldGreenFeeLabel(detail.fieldDetails?.greenFeePerPerson);
  if (!labeled) return FIELD_DETAIL_GREEN_FEE_MISSING;
  return labeled.replace(/^그린피\s+/, '');
}

function recruitCountValue(detail: JoinDetailDto): string {
  const recruitCount =
    detail.recruitCount ?? plannedPlayerCountToRecruitCount(detail.plannedPlayerCount);
  return `${recruitCount}명`;
}

function recruitGenderValue(detail: JoinDetailDto): string {
  return (
    formatStandardGenderCompositionLabel(
      detail.targetMaleCount ?? null,
      detail.targetFemaleCount ?? null,
    ) ?? FIELD_DETAIL_GENDER_ANY
  );
}

function recruitAgeValue(detail: JoinDetailDto): string {
  const minAge = detail.minAge ?? null;
  const maxAge = detail.maxAge ?? null;
  if (minAge == null && maxAge == null) return FIELD_DETAIL_AGE_ANY;
  return formatAgeRangeLabel(minAge, maxAge);
}

function selectedBenefitLabels(detail: JoinDetailDto): string[] {
  return selectedFieldKrwBenefitLabels(normalizeFieldJoinBenefits(detail.fieldDetails));
}

function coinBadgeValue(detail: JoinDetailDto): string | null {
  const amount = Number(detail.rewardPerParticipant);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const display = Number.isInteger(amount) ? String(amount) : String(amount);
  return `+${display} Coin`;
}

function memoSummary(detail: JoinDetailDto): FieldJoinMemoSummary {
  const body = detail.description?.trim() || null;
  if (body) return { body, emptyMessage: null };
  return { body: null, emptyMessage: FIELD_DETAIL_EMPTY_MEMO };
}

/**
 * FIELD detail core info — sectioned values only.
 * Course name stays in the header; this model never repeats it.
 */
export function buildFieldJoinDetailSummary(detail: JoinDetailDto): FieldJoinDetailSummary {
  const selected = selectedBenefitLabels(detail);
  return {
    rounding: {
      location: roundingLocation(detail),
      date: formatJoinScheduleDetailDate(detail.startAt),
      teeTime: formatJoinScheduleDetailTime(detail.startAt),
      greenFee: roundingGreenFee(detail),
    },
    recruit: {
      count: recruitCountValue(detail),
      gender: recruitGenderValue(detail),
      age: recruitAgeValue(detail),
    },
    benefits: {
      selected,
      emptyMessage: selected.length === 0 ? FIELD_DETAIL_EMPTY_BENEFITS : null,
      coinBadge: coinBadgeValue(detail),
    },
    memo: memoSummary(detail),
  };
}
