import { BadRequestException } from '@nestjs/common';
import { firstZodIssueCode } from '@jjoin/validation';
import type { ZodError } from 'zod';

export const JOIN_CREATE_CLIENT_MESSAGES: Record<string, string> = {
  invalid_create_join: '입력 정보를 확인해주세요. 장소·인원·시간을 다시 확인해 주세요.',
  invalid_store_matching_join: '입력 정보를 확인해주세요. 매장·인원·시간을 다시 확인해 주세요.',
  invalid_matching_schedule: '모집 마감과 시작 시간, 최소 인원을 확인해주세요.',
  start_at_must_be_future: '시작 시간은 현재보다 이후여야 합니다.',
  invalid_recruit_closes_at: '모집 마감 시간을 확인해주세요.',
  recruit_closes_must_be_before_start: '모집 마감은 시작 시간보다 이전이어야 합니다.',
  invalid_minimum_players: '최소 진행 인원을 확인해주세요.',
  minimum_exceeds_planned: '최소 인원이 모집 인원보다 많습니다.',
  matching_roster_required: '모집 인원을 확인해주세요.',
  matching_roster_max_four: '모집 인원은 최대 4명입니다.',
  invalid_reward_per_participant: '참가 보상 금액을 확인해주세요.',
  invalid_store_ownership: '매장을 다시 선택해주세요.',
  invalid_player_count: '모집 인원을 확인해주세요.',
  invalid_target_composition: '남녀 모집 인원 구성을 확인해주세요.',
  planned_player_count_out_of_range: '모집 인원은 1~4명이어야 합니다.',
  venue_or_venueId_required: '장소를 선택해주세요.',
  unsupported_sport: '지원하지 않는 종목입니다.',
  gender_composition_sum_mismatch: '남녀 모집 인원 구성을 확인해주세요.',
  invalid_gender_composition: '남녀 모집 인원 구성을 확인해주세요.',
  host_gender_quota_required: '방장 성별 인원이 모집 구성에 포함되어야 합니다.',
  invalid_age_range: '모집 나이 범위를 확인해주세요.',
  invalid_handicap_range: '핸디 범위를 확인해주세요.',
  handicap_range_required: '핸디 범위를 확인해주세요.',
};

export function joinCreateClientMessage(code: string, fallback?: string): string {
  return JOIN_CREATE_CLIENT_MESSAGES[code] ?? fallback ?? '입력 정보를 확인해주세요.';
}

export function joinCreateBadRequest(code: string, fallbackMessage?: string): BadRequestException {
  return new BadRequestException({
    code,
    message: joinCreateClientMessage(code, fallbackMessage),
  });
}

export function joinCreateBadRequestFromZod(
  error: ZodError,
  fallback: string,
): BadRequestException {
  return joinCreateBadRequest(firstZodIssueCode(error, fallback));
}
