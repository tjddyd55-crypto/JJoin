import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendReasonLabel } from './recommend-ui';

test('recommendReasonLabel maps known codes to Korean copy', () => {
  assert.equal(recommendReasonLabel('FOLLOWED_STORE'), '팔로우한 매장');
  assert.equal(recommendReasonLabel('URGENT'), '오늘 긴급 모집');
  assert.equal(recommendReasonLabel('JOINABLE_FALLBACK'), '지금 참가 가능한 조인');
});
