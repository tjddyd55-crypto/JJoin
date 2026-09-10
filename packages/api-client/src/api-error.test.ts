import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiRequestError, parseApiErrorBody } from './api-error';

test('parseApiErrorBody reads string message code', () => {
  const parsed = parseApiErrorBody(JSON.stringify({ message: 'invalid_create_join', statusCode: 400 }));
  assert.equal(parsed.code, 'invalid_create_join');
});

test('parseApiErrorBody reads object message', () => {
  const parsed = parseApiErrorBody(
    JSON.stringify({
      message: { code: 'INSUFFICIENT_BALANCE', message: '보유 코인이 부족합니다.' },
      statusCode: 400,
    }),
  );
  assert.equal(parsed.code, 'INSUFFICIENT_BALANCE');
  assert.equal(parsed.message, '보유 코인이 부족합니다.');
});

test('ApiRequestError exposes status and code', () => {
  const error = new ApiRequestError(
    400,
    JSON.stringify({ message: 'host_gender_quota_required', statusCode: 400 }),
  );
  assert.equal(error.status, 400);
  assert.equal(error.code, 'host_gender_quota_required');
  assert.match(error.message, /api_error:400:host_gender_quota_required/);
});
