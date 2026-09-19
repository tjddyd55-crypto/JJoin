import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatJoinDisplayTitle,
  formatJoinParticipantDisplay,
  mapDiscoverToJoinCardProps,
  mapRecommendedToJoinCardProps,
  recommendShortReasonLabels,
  splitJoinCapacityDisplay,
} from './join-card-map';
import {
  JoinGameStyle,
  JoinStatus,
  VenueType,
  type DiscoverJoinCardDto,
  type RecommendedJoinDto,
} from '@jjoin/types';

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

test('mapRecommendedToJoinCardProps keeps FIELD cost and badge callable', () => {
  const item: RecommendedJoinDto = {
    joinId: 'j-field',
    venueName: '거제CC',
    startAt: '2026-09-17T10:00:00.000Z',
    seatsLeft: 2,
    isUrgent: false,
    reasonCode: 'NEARBY',
    reasonLabel: '내 주변 조인이에요',
    venueType: VenueType.FIELD,
    expectedCostKrw: 70_000,
  };
  const card = mapRecommendedToJoinCardProps(item, () => {}, {
    now: new Date('2026-09-17T03:00:00.000Z'),
  });
  assert.equal(card.costLabel, '예상 70,000원');
  assert.ok(card.statusBadges?.some((badge) => badge.label === '필드'));
});

test('mapDiscoverToJoinCardProps builds character tags and FIELD cost', () => {
  const item: DiscoverJoinCardDto = {
    joinId: 'j-discover',
    status: JoinStatus.OPEN,
    startAt: '2026-09-17T10:00:00.000Z',
    scheduledEndAt: '2026-09-17T13:00:00.000Z',
    venueId: 'v1',
    venueName: '거제CC',
    regionLabel: '거제시',
    sido: '경남',
    sigungu: '거제시',
    latitude: 34.88,
    longitude: 128.62,
    distanceMeters: 1200,
    currentParticipants: 2,
    maxParticipants: 4,
    availableSlots: 2,
    rewardPerParticipant: '0',
    hostNickname: '호스트',
    isHost: false,
    isParticipant: false,
    canJoin: true,
    canJoinState: 'JOINABLE',
    ctaLabel: '참가',
    golfFacilityId: null,
    venueType: VenueType.FIELD,
    expectedCostKrw: 70_000,
    gameStyle: JoinGameStyle.FRIENDLY,
  };
  const card = mapDiscoverToJoinCardProps(item, () => {}, {
    now: new Date('2026-09-17T03:00:00.000Z'),
  });
  assert.equal(card.costLabel, '예상 70,000원');
  assert.ok(card.statusBadges?.some((badge) => badge.label === '필드'));
  assert.ok(Array.isArray(card.infoTags));
});
