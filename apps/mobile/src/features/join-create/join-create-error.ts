import { isApiRequestError } from '@jjoin/api-client';
import { t } from '@jjoin/i18n';

export type JoinCreateFailureLog = {
  status: number | null;
  code: string | null;
  message: string | null;
  details: unknown;
};

export function extractJoinCreateFailureLog(error: unknown): JoinCreateFailureLog {
  if (isApiRequestError(error)) {
    return {
      status: error.status,
      code: error.code,
      message: error.apiMessage ?? error.message,
      details: error.details,
    };
  }
  if (error instanceof Error) {
    return {
      status: null,
      code: null,
      message: error.message,
      details: null,
    };
  }
  return { status: null, code: null, message: String(error), details: null };
}

export function logJoinCreateFailure(error: unknown): void {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!isDev) return;
  const failure = extractJoinCreateFailureLog(error);
  console.warn('[JoinCreateFailure]', failure);
}

const CODE_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: '조인을 만들기 위한 코인이 부족합니다.',
  JOIN_HOST_LIMIT: '현재 생성 가능한 조인 수를 초과했습니다.',
  STORE_OWNERSHIP_REQUIRED: '승인된 매장이 있어야 모집 조인을 만들 수 있습니다.',
  IDENTITY_REQUIRED: '본인 인증 후 조인을 만들 수 있습니다.',
  identity_verification_required: '본인 인증 후 조인을 만들 수 있습니다.',
  gender_composition_sum_mismatch: '남녀 모집 인원 구성을 확인해주세요.',
  invalid_gender_composition: '남녀 모집 인원 구성을 확인해주세요.',
  invalid_target_composition: '남녀 모집 인원 구성을 확인해주세요.',
  host_gender_quota_required: '방장 성별 인원이 모집 구성에 포함되어야 합니다.',
  invalid_age_range: '모집 나이 범위를 확인해주세요.',
  invalid_handicap_range: '핸디 범위를 확인해주세요.',
  handicap_range_required: '핸디 범위를 확인해주세요.',
  start_at_must_be_future: '시작 시간은 현재보다 이후여야 합니다.',
  invalid_recruit_closes_at: '모집 마감 시간을 확인해주세요.',
  recruit_closes_must_be_before_start: '모집 마감은 시작 시간보다 이전이어야 합니다.',
  invalid_matching_schedule: '모집 마감과 시작 시간, 최소 인원을 확인해주세요.',
  invalid_minimum_players: '최소 진행 인원을 확인해주세요.',
  minimum_exceeds_planned: '최소 인원이 모집 인원보다 많습니다.',
  matching_roster_required: '모집 인원을 확인해주세요.',
  matching_roster_max_four: '모집 인원은 최대 4명입니다.',
  planned_player_count_out_of_range: '모집 인원은 1~4명이어야 합니다.',
  invalid_reward_per_participant: '참가 보상 금액을 확인해주세요.',
  invalid_store_ownership: '매장을 다시 선택해주세요.',
  invalid_player_count: '모집 인원을 확인해주세요.',
  invalid_create_join: '입력 정보를 확인해주세요. 장소·인원·시간을 다시 확인해 주세요.',
  invalid_store_matching_join: '입력 정보를 확인해주세요. 매장·인원·시간을 다시 확인해 주세요.',
  venue_or_venueId_required: '장소를 선택해주세요.',
  VENUE_NOT_FOUND: '장소 정보를 확인할 수 없습니다. 다시 선택해 주세요.',
  VENUE_NOT_ACTIVATED: '장소 정보를 확인할 수 없습니다. 다시 선택해 주세요.',
  FACILITY_NOT_FOUND: '매장 시설 정보를 확인할 수 없습니다.',
  FACILITY_NOT_JOIN_ELIGIBLE: '이 매장에서는 조인을 만들 수 없습니다.',
  FACILITY_COORDINATE_REQUIRED: '매장 위치 정보가 없어 조인을 만들 수 없습니다.',
  join_create_conflict: '조인 생성이 중복 요청되었습니다. 잠시 후 다시 시도해주세요.',
  store_join_create_conflict: '조인 생성이 중복 요청되었습니다. 잠시 후 다시 시도해주세요.',
};

function messageFromCode(code: string | null, apiMessage: string | null): string | null {
  if (!code) return apiMessage;
  return CODE_MESSAGES[code] ?? apiMessage;
}

export function messageForJoinCreateError(error: unknown): string {
  logJoinCreateFailure(error);

  if (error instanceof Error && error.message.startsWith('network_error:')) {
    return '네트워크 오류 — API 연결을 확인하세요.';
  }
  if (error instanceof Error && error.message === 'venue_not_ready') {
    return '장소를 선택해주세요.';
  }

  if (isApiRequestError(error)) {
    if (error.status === 401) return '로그인이 필요합니다. 다시 로그인해 주세요.';
    if (error.status >= 500) {
      return '조인 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    const mapped = messageFromCode(error.code, error.apiMessage);
    if (mapped) return mapped;
  }

  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('INSUFFICIENT_BALANCE')) return t('create.coin.insufficient');
  if (msg.includes('JOIN_HOST_LIMIT')) return CODE_MESSAGES.JOIN_HOST_LIMIT;
  if (msg.includes('invalid_create_join') || msg.includes('venue_or_venueId_required')) {
    return CODE_MESSAGES.invalid_create_join;
  }
  if (msg.includes('invalid_store_matching_join')) return CODE_MESSAGES.invalid_store_matching_join;
  if (msg.includes('host_gender_quota_required')) return CODE_MESSAGES.host_gender_quota_required;
  if (msg.includes('STORE_OWNERSHIP_REQUIRED')) return CODE_MESSAGES.STORE_OWNERSHIP_REQUIRED;
  if (msg.includes('start_at_must_be_future')) return CODE_MESSAGES.start_at_must_be_future;
  if (msg.includes('recruit_closes_must_be_before_start')) {
    return CODE_MESSAGES.recruit_closes_must_be_before_start;
  }
  if (msg.includes('invalid_minimum_players') || msg.includes('minimum_exceeds_planned')) {
    return CODE_MESSAGES.invalid_minimum_players;
  }

  return '조인 생성에 실패했습니다. 입력 정보와 네트워크 상태를 확인한 뒤 다시 시도해주세요.';
}

export function isJoinHostLimitError(error: unknown): boolean {
  if (isApiRequestError(error)) return error.code === 'JOIN_HOST_LIMIT';
  const msg = error instanceof Error ? error.message : '';
  return msg.includes('JOIN_HOST_LIMIT');
}

export function isJoinCreateAuthError(error: unknown): boolean {
  if (isApiRequestError(error)) return error.status === 401;
  const msg = error instanceof Error ? error.message : '';
  return msg.includes('api_error:401') || msg.includes('unauthorized');
}
