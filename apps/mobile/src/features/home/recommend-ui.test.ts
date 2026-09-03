import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendReasonLabel } from './recommend-ui';

test('recommendReasonLabel maps known codes to Korean copy', () => {
  assert.equal(recommendReasonLabel('FOLLOWED_STORE'), '팔로우한 매장');
  assert.equal(recommendReasonLabel('URGENT'), '오늘 긴급 모집');
  assert.equal(recommendReasonLabel('JOINABLE_FALLBACK'), '지금 참가 가능한 조인');
  assert.equal(
    recommendReasonLabel('PLAYED_TOGETHER_HOST'),
    '전에 같이 친 분이 만든 조인이에요',
  );
  assert.equal(
    recommendReasonLabel('PLAYED_TOGETHER_PARTICIPANT'),
    '같이 친 사람이 참여 중이에요',
  );
  assert.equal(recommendReasonLabel('ALMOST_FILLED'), '1명만 더 모이면 성사돼요');
  assert.equal(recommendReasonLabel('NEARBY'), '내 주변 조인이에요');
  assert.equal(recommendReasonLabel('CLOSING_SOON'), '곧 모집이 마감돼요');
  assert.equal(recommendReasonLabel('HIGH_RATED_HOST'), '평점이 좋은 방장이에요');
  assert.equal(recommendReasonLabel('FREQUENT_VENUE'), '자주 이용한 매장이에요');
});
