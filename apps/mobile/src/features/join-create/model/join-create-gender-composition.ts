import {
  formatStandardGenderCompositionLabel,
  hasFixedGenderComposition,
  normalizeFixedGenderComposition,
  validateFixedGenderComposition,
  type MatchingGender,
} from '@jjoin/domain';
import type { CreateJoinRequest, JoinDetailDto, UpdateJoinRequest } from '@jjoin/types';

export type JoinGenderCompositionMode = 'ANY' | 'FIXED';

export type JoinGenderCompositionState = {
  mode: JoinGenderCompositionMode;
  /** SSOT when mode=FIXED; female = total - maleCapacity */
  maleCapacity: number;
};

export function defaultJoinGenderComposition(totalCapacity: number): JoinGenderCompositionState {
  const male = Math.max(1, Math.ceil(totalCapacity / 2));
  return { mode: 'ANY', maleCapacity: Math.min(totalCapacity, male) };
}

export function joinGenderCompositionFromDetail(detail: JoinDetailDto): JoinGenderCompositionState {
  if (hasFixedGenderComposition(detail.targetMaleCount, detail.targetFemaleCount)) {
    return {
      mode: 'FIXED',
      maleCapacity: detail.targetMaleCount ?? 0,
    };
  }
  return defaultJoinGenderComposition(detail.plannedPlayerCount);
}

export function genderCompositionSummaryLabel(
  state: JoinGenderCompositionState,
  totalCapacity: number,
): string {
  if (state.mode === 'ANY') return '성별 무관';
  const { targetMaleCount, targetFemaleCount } = normalizeFixedGenderComposition(
    totalCapacity,
    state.maleCapacity,
  );
  return formatStandardGenderCompositionLabel(targetMaleCount, targetFemaleCount) ?? '성별 무관';
}

export function genderCompositionPayload(
  state: JoinGenderCompositionState,
  totalCapacity: number,
): Pick<
  CreateJoinRequest & UpdateJoinRequest,
  'genderCompositionMode' | 'targetMaleCount' | 'targetFemaleCount'
> {
  if (state.mode === 'ANY') {
    return { genderCompositionMode: 'ANY' };
  }
  const { targetMaleCount, targetFemaleCount } = normalizeFixedGenderComposition(
    totalCapacity,
    state.maleCapacity,
  );
  return {
    genderCompositionMode: 'FIXED',
    targetMaleCount,
    targetFemaleCount,
  };
}

export function resolveHostGenderFromDisplay(
  genderDisplay: string | null | undefined,
): MatchingGender | null {
  if (genderDisplay === '남성') return 'MALE';
  if (genderDisplay === '여성') return 'FEMALE';
  return null;
}

export function clampMaleCapacity(
  maleCapacity: number,
  totalCapacity: number,
  hostGender?: MatchingGender | null,
): number {
  let male = Math.max(0, Math.min(totalCapacity, Math.trunc(maleCapacity)));
  if (hostGender === 'MALE' && male < 1) male = 1;
  if (hostGender === 'FEMALE' && male > totalCapacity - 1) {
    male = Math.max(0, totalCapacity - 1);
  }
  return male;
}

export function validateJoinGenderCompositionClient(params: {
  state: JoinGenderCompositionState;
  totalCapacity: number;
  hostGender?: MatchingGender | null;
}): { ok: true } | { ok: false; message: string } {
  if (params.state.mode === 'ANY') return { ok: true };
  const { targetMaleCount, targetFemaleCount } = normalizeFixedGenderComposition(
    params.totalCapacity,
    params.state.maleCapacity,
  );
  const result = validateFixedGenderComposition({
    totalCapacity: params.totalCapacity,
    targetMaleCount,
    targetFemaleCount,
    hostGender: params.hostGender,
  });
  if (!result.ok) {
    if (result.code === 'host_gender_quota_required') {
      return { ok: false, message: '방장 성별에 맞는 모집 인원이 필요합니다.' };
    }
    return { ok: false, message: '성별 구성을 확인해주세요.' };
  }
  return { ok: true };
}

export function adjustMaleCapacity(
  current: number,
  delta: number,
  totalCapacity: number,
  hostGender?: MatchingGender | null,
): number {
  return clampMaleCapacity(current + delta, totalCapacity, hostGender);
}
