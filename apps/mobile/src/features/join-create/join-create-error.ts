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
  gender_composition_sum_mismatch: '남녀 모집 인원 구성을 확인해주세요.',
  invalid_gender_composition: '남녀 모집 인원 구성을 확인해주세요.',
  host_gender_quota_required: '방장 성별 인원이 모집 구성에 포함되어야 합니다.',
  invalid_age_range: '모집 나이 범위를 확인해주세요.',
  invalid_handicap_range: '핸디 범위를 확인해주세요.',
  handicap_range_required: '핸디 범위를 확인해주세요.',
  start_at_must_be_future: '시작 시간을 확인해주세요.',
  invalid_create_join: '입력 정보를 확인해주세요. 장소·인원·시간을 다시 확인해 주세요.',
  venue_or_venueId_required: '장소를 선택해주세요.',
  VENUE_NOT_FOUND: '장소 정보를 확인할 수 없습니다. 다시 선택해 주세요.',
  VENUE_NOT_ACTIVATED: '장소 정보를 확인할 수 없습니다. 다시 선택해 주세요.',
  join_create_conflict: '조인 생성이 중복 요청되었습니다. 잠시 후 다시 시도해주세요.',
  identity_verification_required: '본인 인증 후 조인을 만들 수 있습니다.',
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
    if (error.status === 401) return '로그인이 필요합니다.';
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
  if (msg.includes('host_gender_quota_required')) return CODE_MESSAGES.host_gender_quota_required;

  return '조인 생성에 실패했습니다.';
}

export function isJoinHostLimitError(error: unknown): boolean {
  if (isApiRequestError(error)) return error.code === 'JOIN_HOST_LIMIT';
  const msg = error instanceof Error ? error.message : '';
  return msg.includes('JOIN_HOST_LIMIT');
}
