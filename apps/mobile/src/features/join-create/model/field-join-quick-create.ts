import {
  FIELD_ALLOWED_RECRUIT_COUNTS,
  isFieldRecruitCount,
  recruitCountToPlannedPlayerCount,
  type FieldRecruitCount,
} from '@jjoin/domain';

export const FIELD_QUICK_CREATE_DEFAULT_RECRUIT: FieldRecruitCount = 3;

export function resolveFieldCreatePlayersFromParams(playersParam?: string): number {
  const raw = Number(playersParam);
  if (Number.isInteger(raw) && raw >= 2) {
    const recruit = raw - 1;
    if (isFieldRecruitCount(recruit)) {
      return recruitCountToPlannedPlayerCount(recruit);
    }
    if (isFieldRecruitCount(raw)) {
      return recruitCountToPlannedPlayerCount(raw);
    }
  }
  return recruitCountToPlannedPlayerCount(FIELD_QUICK_CREATE_DEFAULT_RECRUIT);
}

export function isFieldGreenFeeReady(greenFeePerPerson: number | null | undefined): boolean {
  return (
    greenFeePerPerson != null &&
    Number.isInteger(greenFeePerPerson) &&
    greenFeePerPerson >= 0
  );
}

export function isFieldQuickCreateReady(params: {
  venueReady: boolean;
  startAtValid: boolean;
  recruitCount: number;
  greenFeePerPerson: number | null | undefined;
}): boolean {
  return (
    params.venueReady &&
    params.startAtValid &&
    isFieldRecruitCount(params.recruitCount) &&
    isFieldGreenFeeReady(params.greenFeePerPerson)
  );
}

export function fieldQuickCreateRequiredLabels(): string[] {
  return ['골프장', '날짜', '티타임', '그린피', '모집 인원'];
}

/** Coin stays 0 unless the host explicitly opens the optional reward. */
export function fieldQuickCreateEffectiveReward(
  coinSelected: boolean,
  rewardPerParticipant: string,
): string {
  return coinSelected ? rewardPerParticipant : '0';
}

export const FIELD_QUICK_CREATE_OPTIONAL_LABELS = [
  '성별 조건',
  '나이',
  '참가자 혜택',
  '코인',
  '방장 메모',
] as const;

export { FIELD_ALLOWED_RECRUIT_COUNTS };
