import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatJoinDisplayTitle,
  formatJoinParticipantDisplay,
  recommendShortReasonLabels,
  splitJoinCapacityDisplay,
} from './join-card-map';
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
  assert.equal(tags[1], '시간대가 맞아요');
});

test('splitJoinCapacityDisplay separates count and seat highlight', () => {
  const parts = splitJoinCapacityDisplay({ current: 0, max: 4, seatsLeft: 4 });
  assert.equal(parts.countLabel, '0/4명');
  assert.equal(parts.seatsHighlight, '4자리 남음');
  assert.equal(parts.seatsHighlightTone, 'available');
});

test('splitJoinCapacityDisplay marks last seat tone', () => {
  const parts = splitJoinCapacityDisplay({ current: 3, max: 4, seatsLeft: 1 });
  assert.equal(parts.seatsHighlightTone, 'lastSeat');
});

test('formatJoinParticipantDisplay normalizes seat info once', () => {
  assert.equal(formatJoinParticipantDisplay({ seatsLeft: 4 }), '4자리 남음');
  assert.equal(
    formatJoinParticipantDisplay({ current: 0, max: 4, seatsLeft: 4 }),
    '0/4명 · 4자리 남음',
  );
});

test('formatJoinDisplayTitle maps DEV QA names in dev builds', () => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  assert.equal(formatJoinDisplayTitle('QA-Role-Coin-1788411173874'), '거제 오션뷰 스크린');
  assert.equal(formatJoinDisplayTitle('DEV E2E 스크린골프'), '퇴근 후 저녁 라운드');
});
