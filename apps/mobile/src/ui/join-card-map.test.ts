import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recommendShortReasonLabels } from './join-card-map';
import type { RecommendedJoinDto } from '@jjoin/types';

test('recommendShortReasonLabels returns max 2 short tags', () => {
  const item: RecommendedJoinDto = {
    joinId: 'j1',
    venueName: '테스트',
    startAt: '2026-06-03T10:00:00.000Z',
    seatsLeft: 2,
    isUrgent: false,
    reasonCode: 'NEARBY',
    reasonLabel: '내 주변 조인이에요',
    reasons: [
      { code: 'NEARBY', label: '내 주변 조인이에요' },
      { code: 'PREFERRED_TIME', label: '자주 가는 시간대' },
      { code: 'URGENT', label: '오늘 긴급 모집' },
    ],
  };
  const tags = recommendShortReasonLabels(item);
  assert.equal(tags.length, 2);
  assert.equal(tags[0], '내 주변');
  assert.equal(tags[1], '선호 시간');
});
