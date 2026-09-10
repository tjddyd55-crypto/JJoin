import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiRequestError } from '@jjoin/api-client';
import {
  extractJoinCreateFailureLog,
  isJoinCreateAuthError,
  isJoinHostLimitError,
  messageForJoinCreateError,
} from './join-create-error';

test('messageForJoinCreateError maps insufficient balance', () => {
  const error = new ApiRequestError(
    400,
    JSON.stringify({
      message: { code: 'INSUFFICIENT_BALANCE', message: '보유 코인이 부족합니다.' },
      statusCode: 400,
    }),
  );
  assert.equal(messageForJoinCreateError(error), '조인을 만들기 위한 코인이 부족합니다.');
});

test('messageForJoinCreateError maps host gender quota', () => {
  const error = new ApiRequestError(
    400,
    JSON.stringify({ message: 'host_gender_quota_required', statusCode: 400 }),
  );
  assert.equal(
    messageForJoinCreateError(error),
    '방장 성별 인원이 모집 구성에 포함되어야 합니다.',
  );
});

test('messageForJoinCreateError maps invalid_create_join', () => {
  const error = new ApiRequestError(
    400,
    JSON.stringify({ message: 'invalid_create_join', statusCode: 400 }),
  );
  assert.match(messageForJoinCreateError(error), /입력 정보를 확인해주세요/);
});

test('messageForJoinCreateError uses 5xx fallback', () => {
  const error = new ApiRequestError(500, JSON.stringify({ message: 'Internal error', statusCode: 500 }));
  assert.match(messageForJoinCreateError(error), /잠시 후 다시 시도/);
});

test('isJoinHostLimitError detects structured code', () => {
  const error = new ApiRequestError(
    403,
    JSON.stringify({
      message: { code: 'JOIN_HOST_LIMIT', message: 'limit' },
      statusCode: 403,
    }),
  );
  assert.equal(isJoinHostLimitError(error), true);
});

test('messageForJoinCreateError maps store ownership and schedule codes', () => {
  const ownership = new ApiRequestError(
    403,
    JSON.stringify({
      message: { code: 'STORE_OWNERSHIP_REQUIRED', message: '활성 매장 소유권이 필요합니다.' },
      statusCode: 403,
    }),
  );
  assert.equal(
    messageForJoinCreateError(ownership),
    '승인된 매장이 있어야 모집 조인을 만들 수 있습니다.',
  );

  const schedule = new ApiRequestError(
    400,
    JSON.stringify({
      message: {
        code: 'recruit_closes_must_be_before_start',
        message: '모집 마감은 시작 시간보다 이전이어야 합니다.',
      },
      statusCode: 400,
    }),
  );
  assert.match(messageForJoinCreateError(schedule), /모집 마감/);

  const insufficient = new ApiRequestError(
    400,
    JSON.stringify({
      message: { code: 'INSUFFICIENT_BALANCE', message: '보유 코인이 부족합니다.' },
      statusCode: 400,
    }),
  );
  assert.match(messageForJoinCreateError(insufficient), /코인이 부족/);
});

test('isJoinCreateAuthError detects 401', () => {
  const error = new ApiRequestError(401, JSON.stringify({ message: 'unauthorized', statusCode: 401 }));
  assert.equal(isJoinCreateAuthError(error), true);
  assert.match(messageForJoinCreateError(error), /로그인/);
});

test('extractJoinCreateFailureLog preserves status and code', () => {
  const error = new ApiRequestError(
    400,
    JSON.stringify({ message: 'start_at_must_be_future', statusCode: 400 }),
  );
  const log = extractJoinCreateFailureLog(error);
  assert.equal(log.status, 400);
  assert.equal(log.code, 'start_at_must_be_future');
});
