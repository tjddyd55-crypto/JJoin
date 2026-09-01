import assert from 'node:assert/strict';
import test from 'node:test';
import type { DiscoverJoinCardDto, RecommendedJoinDto } from '@jjoin/types';
import { JoinStatus } from '@jjoin/types';
import {
  clubAttendanceLabel,
  formatHomeJoinTime,
  formatHomeRegionLabel,
  formatRemainingSeats,
  pickTodayDiscoverJoins,
  pickUrgentJoins,
} from './home-format';

const baseDiscover = (overrides: Partial<DiscoverJoinCardDto> = {}): DiscoverJoinCardDto =>
  ({
    joinId: 'j1',
    status: JoinStatus.OPEN,
    startAt: '2026-09-02T10:00:00.000Z',
    scheduledEndAt: '2026-09-02T12:00:00.000Z',
    venueId: 'v1',
    venueName: '테스트 매장',
    regionLabel: '서울',
    sido: '서울',
    sigungu: '강남구',
    latitude: 37.5,
    longitude: 127.0,
    distanceMeters: 100,
    currentParticipants: 2,
    maxParticipants: 4,
    availableSlots: 2,
    rewardPerParticipant: '1000',
    hostNickname: 'host',
    isHost: false,
    isParticipant: false,
    canJoin: true,
    canJoinState: 'JOINABLE',
    ctaLabel: '참여',
    golfFacilityId: null,
    ...overrides,
  }) as DiscoverJoinCardDto;

test('formatHomeJoinTime prefixes today label', () => {
  const label = formatHomeJoinTime('2026-09-02T01:00:00.000Z', new Date('2026-09-02T12:00:00.000Z'));
  assert.match(label, /^오늘 /);
});

test('formatHomeRegionLabel prefers sigungu', () => {
  assert.equal(formatHomeRegionLabel('서울', '강남구'), '강남구');
  assert.equal(formatHomeRegionLabel(null, null), '지역 미정');
});

test('formatRemainingSeats handles zero slots', () => {
  assert.equal(formatRemainingSeats(0), '마감');
  assert.equal(formatRemainingSeats(3), '3자리 남음');
});

test('pickTodayDiscoverJoins keeps joinable today items only', () => {
  const now = new Date('2026-09-02T12:00:00.000Z');
  const items = [
    baseDiscover({ joinId: 'a', startAt: '2026-09-02T14:00:00.000Z', scheduledEndAt: '2026-09-02T18:00:00.000Z' }),
    baseDiscover({ joinId: 'b', startAt: '2026-09-03T14:00:00.000Z', scheduledEndAt: '2026-09-03T18:00:00.000Z' }),
    baseDiscover({ joinId: 'c', canJoinState: 'FULL', availableSlots: 0, canJoin: false }),
  ];
  const picked = pickTodayDiscoverJoins(items, 2, now);
  assert.deepEqual(picked.map((j) => j.joinId), ['a']);
});

test('pickUrgentJoins returns urgent recommended joins', () => {
  const recommended: RecommendedJoinDto[] = [
    {
      joinId: 'u1',
      venueName: 'urgent venue',
      startAt: '2026-09-02T10:00:00.000Z',
      seatsLeft: 1,
      isUrgent: true,
      reasonCode: 'URGENT',
      reasonLabel: '긴급',
    },
    {
      joinId: 'n1',
      venueName: 'normal',
      startAt: '2026-09-02T11:00:00.000Z',
      seatsLeft: 2,
      isUrgent: false,
      reasonCode: 'TODAY_NEARBY',
      reasonLabel: '가까운 조인',
    },
  ];
  const picked = pickUrgentJoins([], recommended, 2);
  assert.deepEqual(picked.map((j) => j.joinId), ['u1']);
});

test('clubAttendanceLabel maps response codes', () => {
  assert.equal(clubAttendanceLabel('ATTENDING'), '참석');
  assert.equal(clubAttendanceLabel('NO_RESPONSE'), '미응답');
  assert.equal(clubAttendanceLabel(undefined), null);
});
