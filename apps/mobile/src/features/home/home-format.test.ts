import assert from 'node:assert/strict';
import test from 'node:test';
import type { ApiClient } from '@jjoin/api-client';
import { createDefaultDiscoveryFilter } from '@jjoin/domain';
import type { DiscoverJoinCardDto, RecommendedJoinDto } from '@jjoin/types';
import { JoinStatus, VenueType } from '@jjoin/types';
import type { DiscoverQuery } from '../explore/discovery/api/join-discover-api';
import {
  buildHomeFieldNationwideQuery,
  buildHomeNationwideDiscoverQuery,
  buildHomeNearbyDiscoverQuery,
  loadHomeDiscoverRows,
  resolveHomeDiscoverDevelopmentVariant,
  selectHomeFieldDiscoverRows,
  shouldFallbackHomeDiscoverNationwide,
} from './home-discover';
import {
  clubAttendanceLabel,
  formatHomeJoinTime,
  formatHomeRegionLabel,
  formatRemainingSeats,
  pickTodayDiscoverJoins,
  pickUrgentJoins,
  pickVenueDiscoverJoins,
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

test('home discover asks for SCREEN and FIELD separately', () => {
  const nearby = {
    date: '2026-09-21',
    lat: 37.54,
    lng: 127.05,
    radiusMeters: 5000,
  };
  const screen = buildHomeNearbyDiscoverQuery('SCREEN', nearby);
  const field = buildHomeNearbyDiscoverQuery('FIELD', nearby);
  const nationwide = buildHomeFieldNationwideQuery(nearby.date);
  assert.equal(screen.venueType, 'SCREEN');
  assert.equal(field.venueType, 'FIELD');
  assert.equal(field.regionMode, 'NEARBY');
  assert.equal(field.joinability, 'JOINABLE');
  assert.equal(field.radiusMeters, nearby.radiusMeters);
  assert.equal(nationwide.venueType, 'FIELD');
  assert.equal(nationwide.regionMode, 'ALL');
  assert.equal(nationwide.joinability, 'ALL');
  assert.equal(nationwide.radiusMeters, undefined);
});

test('home nationwide SCREEN query matches 전체보기 defaults', () => {
  const now = new Date('2026-09-22T15:30:00.000Z');
  const defaults = createDefaultDiscoveryFilter(now);
  const screen = buildHomeNationwideDiscoverQuery('SCREEN', defaults.date);
  assert.equal(defaults.date, '2026-09-23');
  assert.equal(defaults.region.mode, 'ALL');
  assert.equal(defaults.joinability, 'ALL');
  assert.equal(defaults.sort, 'TIME');
  assert.equal(screen.date, defaults.date);
  assert.equal(screen.regionMode, defaults.region.mode);
  assert.equal(screen.sort, defaults.sort);
  assert.equal(screen.joinability, defaults.joinability);
  assert.equal(screen.venueType, 'SCREEN');
  assert.equal(screen.radiusMeters, undefined);
});

test('home SCREEN nationwide fallback is development-only', () => {
  const screen = buildHomeNationwideDiscoverQuery('SCREEN', '2026-09-21');
  assert.equal(screen.venueType, 'SCREEN');
  assert.equal(screen.regionMode, 'ALL');
  assert.equal(screen.joinability, 'ALL');
  assert.equal(
    shouldFallbackHomeDiscoverNationwide({
      venueType: 'SCREEN',
      nearbyCount: 0,
      developmentVariant: false,
    }),
    false,
  );
  assert.equal(
    shouldFallbackHomeDiscoverNationwide({
      venueType: 'SCREEN',
      nearbyCount: 0,
      developmentVariant: true,
    }),
    true,
  );
  assert.equal(
    shouldFallbackHomeDiscoverNationwide({
      venueType: 'FIELD',
      nearbyCount: 0,
      developmentVariant: false,
    }),
    true,
  );
  assert.equal(
    shouldFallbackHomeDiscoverNationwide({
      venueType: 'SCREEN',
      nearbyCount: 2,
      developmentVariant: true,
    }),
    false,
  );
});

test('DEV package enables SCREEN fallback when Metro reports production', () => {
  assert.equal(
    resolveHomeDiscoverDevelopmentVariant({
      appVariant: 'production',
      applicationId: 'com.jjoin.app.dev',
    }),
    true,
  );
  assert.equal(
    resolveHomeDiscoverDevelopmentVariant({
      appVariant: 'development',
      applicationId: 'com.jjoin.app',
    }),
    false,
  );
  assert.equal(
    resolveHomeDiscoverDevelopmentVariant({
      appVariant: 'development',
      applicationId: null,
    }),
    true,
  );
  assert.equal(
    resolveHomeDiscoverDevelopmentVariant({
      appVariant: 'production',
      applicationId: null,
    }),
    false,
  );
});

test('home FIELD falls back to the nationwide list only when nearby is empty', () => {
  const nearby = [baseDiscover({ joinId: 'near', venueType: VenueType.FIELD })];
  const nationwide = [baseDiscover({ joinId: 'far', venueType: VenueType.FIELD })];
  assert.equal(selectHomeFieldDiscoverRows(nearby, nationwide)[0]?.joinId, 'near');
  assert.equal(selectHomeFieldDiscoverRows([], nationwide)[0]?.joinId, 'far');
});

test('pickVenueDiscoverJoins keeps list-visible rows for the venue type', () => {
  const items = [
    baseDiscover({ joinId: 'f1', venueType: VenueType.FIELD, startAt: '2026-09-02T16:00:00.000Z' }),
    baseDiscover({ joinId: 's1', venueType: VenueType.SCREEN, startAt: '2026-09-02T15:00:00.000Z' }),
    baseDiscover({
      joinId: 'f2',
      venueType: VenueType.FIELD,
      canJoinState: 'FULL',
      canJoin: false,
      startAt: '2026-09-02T11:00:00.000Z',
    }),
    baseDiscover({
      joinId: 's-host',
      venueType: VenueType.SCREEN,
      canJoinState: 'HOST',
      canJoin: false,
      startAt: '2026-09-02T09:00:00.000Z',
    }),
  ];
  const field = pickVenueDiscoverJoins(items, VenueType.FIELD, 2);
  const screen = pickVenueDiscoverJoins(items, VenueType.SCREEN, 2);
  assert.deepEqual(field.map((j) => j.joinId), ['f2', 'f1']);
  assert.deepEqual(screen.map((j) => j.joinId), ['s-host', 's1']);
});

function discoverApi(rowsFor: (query: DiscoverQuery) => DiscoverJoinCardDto[]) {
  const calls: DiscoverQuery[] = [];
  const api = {
    async getDiscoverJoins(query: DiscoverQuery) {
      calls.push(query);
      const upcoming = rowsFor(query);
      return {
        date: query.date,
        regionMode: query.regionMode,
        regionLabel: query.regionMode,
        sort: query.sort ?? 'TIME',
        joinability: query.joinability ?? 'ALL',
        ongoing: [],
        upcoming,
        totalCount: upcoming.length,
      };
    },
  };
  return { api: api as unknown as ApiClient, calls };
}

function nationwideWhenNearbyEmpty(query: DiscoverQuery): DiscoverJoinCardDto[] {
  if (query.regionMode === 'NEARBY') return [];
  if (query.venueType === 'SCREEN') {
    return [
      baseDiscover({
        joinId: 'screen-nation',
        venueType: VenueType.SCREEN,
        canJoinState: 'FULL',
        canJoin: false,
      }),
    ];
  }
  return [baseDiscover({ joinId: 'field-nation', venueType: VenueType.FIELD })];
}

test('nearby SCREEN empty still shows nationwide SCREEN rows on the DEV binary', async () => {
  const { api, calls } = discoverApi(nationwideWhenNearbyEmpty);
  const developmentVariant = resolveHomeDiscoverDevelopmentVariant({
    appVariant: 'production',
    applicationId: 'com.jjoin.app.dev',
  });
  const rows = await loadHomeDiscoverRows(api, {
    date: '2026-09-23',
    coords: { lat: 35.1, lng: 129.04 },
    radiusMeters: 5000,
    developmentVariant,
  });
  const screenCall = calls.find(
    (query) => query.venueType === 'SCREEN' && query.regionMode === 'ALL',
  );
  assert.ok(screenCall);
  assert.equal(screenCall?.date, '2026-09-23');
  assert.equal(screenCall?.joinability, 'ALL');
  assert.equal(screenCall?.sort, 'TIME');
  assert.equal(screenCall?.radiusMeters, undefined);
  const screen = pickVenueDiscoverJoins(rows, VenueType.SCREEN, 3);
  const field = pickVenueDiscoverJoins(rows, VenueType.FIELD, 3);
  assert.deepEqual(screen.map((join) => join.joinId), ['screen-nation']);
  assert.deepEqual(field.map((join) => join.joinId), ['field-nation']);
});

test('production package keeps SCREEN nearby-only and still falls back FIELD', async () => {
  const { api, calls } = discoverApi(nationwideWhenNearbyEmpty);
  const developmentVariant = resolveHomeDiscoverDevelopmentVariant({
    appVariant: 'development',
    applicationId: 'com.jjoin.app',
  });
  const rows = await loadHomeDiscoverRows(api, {
    date: '2026-09-23',
    coords: { lat: 35.1, lng: 129.04 },
    radiusMeters: 5000,
    developmentVariant,
  });
  assert.equal(
    calls.some((query) => query.venueType === 'SCREEN' && query.regionMode === 'ALL'),
    false,
  );
  assert.equal(
    calls.some((query) => query.venueType === 'FIELD' && query.regionMode === 'ALL'),
    true,
  );
  assert.deepEqual(pickVenueDiscoverJoins(rows, VenueType.SCREEN, 3), []);
  assert.deepEqual(
    pickVenueDiscoverJoins(rows, VenueType.FIELD, 3).map((join) => join.joinId),
    ['field-nation'],
  );
});

test('nearby SCREEN rows win over the nationwide list', async () => {
  const { api, calls } = discoverApi((query) => {
    if (query.venueType === 'SCREEN' && query.regionMode === 'NEARBY') {
      return [baseDiscover({ joinId: 'screen-near', venueType: VenueType.SCREEN })];
    }
    if (query.regionMode === 'NEARBY') return [];
    return [baseDiscover({ joinId: 'field-nation', venueType: VenueType.FIELD })];
  });
  const rows = await loadHomeDiscoverRows(api, {
    date: '2026-09-23',
    coords: { lat: 37.5, lng: 127.0 },
    radiusMeters: 5000,
    developmentVariant: true,
  });
  assert.equal(
    calls.some((query) => query.venueType === 'SCREEN' && query.regionMode === 'ALL'),
    false,
  );
  assert.deepEqual(
    pickVenueDiscoverJoins(rows, VenueType.SCREEN, 3).map((join) => join.joinId),
    ['screen-near'],
  );
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
