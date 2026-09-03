import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOwnerDashboardKpi,
  computeReParticipantCount,
} from './store-owner-dashboard';
import {
  listUpcomingWeeklyStarts,
  nextWeeklyOccurrenceStart,
  occurrenceDateKeyFromStart,
} from './recurring-join-schedule';
import {
  inferPreferredHours,
  rankRecommendations,
  type RecommendCandidate,
  type RecommendUserContext,
} from './join-recommendations';

test('reParticipantCount requires 2+ distinct COMPLETED joins', () => {
  assert.equal(
    computeReParticipantCount([
      { joinId: 'a', userId: 'u1', participationStatus: 'COMPLETED' },
      { joinId: 'a', userId: 'u1', participationStatus: 'COMPLETED' },
      { joinId: 'b', userId: 'u1', participationStatus: 'NO_SHOW' },
      { joinId: 'c', userId: 'u2', participationStatus: 'COMPLETED' },
      { joinId: 'd', userId: 'u2', participationStatus: 'COMPLETED' },
    ]),
    1,
  );
});

test('owner dashboard KPI reuses attempt/succeed and adds extras', () => {
  const kpi = buildOwnerDashboardKpi({
    period: 'all',
    followerCount: 4,
    joins: [
      {
        id: '1',
        status: 'COMPLETED',
        startAt: '2026-08-01T10:00:00+09:00',
        confirmedPlayerCount: 4,
        isUrgent: true,
      },
      {
        id: '2',
        status: 'CANCELLED',
        startAt: '2026-08-02T10:00:00+09:00',
        confirmedPlayerCount: 1,
        isUrgent: false,
      },
      {
        id: '3',
        status: 'OPEN',
        startAt: '2026-08-03T10:00:00+09:00',
        confirmedPlayerCount: 2,
        isUrgent: true,
      },
    ],
    attendedRows: [
      { joinId: '1', userId: 'a', participationStatus: 'COMPLETED' },
      { joinId: '1', userId: 'b', participationStatus: 'COMPLETED' },
    ],
  });
  assert.equal(kpi.attemptCount, 3);
  assert.equal(kpi.succeededCount, 1);
  assert.equal(kpi.cancelledCount, 1);
  assert.equal(kpi.followerCount, 4);
  assert.equal(kpi.urgentAttemptCount, 2);
  assert.equal(kpi.urgentSucceededCount, 1);
});

test('weekly occurrence is idempotent by date key', () => {
  const after = new Date('2026-08-31T00:00:00+09:00');
  const next = nextWeeklyOccurrenceStart({
    dayOfWeek: 3,
    startTimeLocal: '19:00',
    after,
  });
  assert.equal(occurrenceDateKeyFromStart(next).length, 10);
  const list = listUpcomingWeeklyStarts({
    dayOfWeek: 3,
    startTimeLocal: '19:00',
    from: after,
    aheadWeeks: 3,
  });
  assert.ok(list.length >= 2 && list.length <= 4);
  const keys = new Set(list.map(occurrenceDateKeyFromStart));
  assert.equal(keys.size, list.length);
});

test('recommendations prefer followed store over bare fallback', () => {
  const base: Omit<RecommendCandidate, 'joinId' | 'golfFacilityId' | 'isUrgent'> =
    {
      status: 'OPEN',
      startAt: '2026-09-01T19:00:00+09:00',
      plannedPlayerCount: 4,
      confirmedPlayerCount: 1,
      hostUserId: 'host',
      venueId: 'v1',
      sido: '서울특별시',
      sigungu: '강남구',
      startHourKst: 19,
      participantUserIds: [],
    };
  const candidates: RecommendCandidate[] = [
    { ...base, joinId: 'low', golfFacilityId: 'f-other', isUrgent: false },
    { ...base, joinId: 'high', golfFacilityId: 'f-follow', isUrgent: true },
  ];
  const ctx: RecommendUserContext = {
    userId: 'me',
    followedFacilityIds: new Set(['f-follow']),
    pastAttendedVenueIds: new Set(),
    preferredHours: inferPreferredHours([19, 19, 20]),
    regionPrefs: [{ sido: '서울특별시', sigungu: '강남구' }],
    playedTogetherUserIds: new Set(),
  };
  const ranked = rankRecommendations(candidates, ctx, {
    now: new Date('2026-08-31T12:00:00+09:00'),
  });
  assert.equal(ranked[0]?.joinId, 'high');
  assert.ok(ranked[0]!.signals.includes('FOLLOWED_STORE'));
  assert.ok(ranked[0]!.score > (ranked[1]?.score ?? 0));
});
