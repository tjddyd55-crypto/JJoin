import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RECOMMEND_REASON_SHORT_LABEL_KO } from './join-recommendations';

test('short recommendation labels are compact for join cards', () => {
  assert.equal(RECOMMEND_REASON_SHORT_LABEL_KO.NEARBY, '내 주변');
  assert.equal(RECOMMEND_REASON_SHORT_LABEL_KO.PLAYED_TOGETHER_HOST, '함께 친 방장');
  assert.equal(RECOMMEND_REASON_SHORT_LABEL_KO.PREFERRED_TIME, '시간대가 맞아요');
  assert.equal(RECOMMEND_REASON_SHORT_LABEL_KO.HIGH_RATED_HOST, '평점이 좋아요');
  assert.ok(RECOMMEND_REASON_SHORT_LABEL_KO.NEARBY.length <= 12);
  assert.ok(
    RECOMMEND_REASON_SHORT_LABEL_KO.PLAYED_TOGETHER_HOST.length <
      '전에 같이 친 분이 만든 조인이에요'.length,
  );
});
