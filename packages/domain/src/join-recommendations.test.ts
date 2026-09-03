import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RECOMMENDATION_WEIGHTS,
  almostFilledBonus,
  buildRecommendationReasons,
  closingSoonBonus,
  hostRatingBonus,
  isRecommendableJoin,
  isStrongRecommendationAlertSignal,
  nearbyDistanceBonus,
  playedTogetherParticipantBonus,
  rankRecommendations,
  scoreRecommendation,
  type RecommendCandidate,
  type RecommendUserContext,
} from './join-recommendations';

const now = new Date('2026-09-03T03:00:00.000Z'); // KST 12:00

function baseCandidate(
  overrides: Partial<RecommendCandidate> = {},
): RecommendCandidate {
  return {
    joinId: 'j1',
    status: 'OPEN',
    startAt: '2026-09-03T10:00:00.000Z', // KST 19:00 same day
    plannedPlayerCount: 4,
    confirmedPlayerCount: 2,
    isUrgent: false,
    hostUserId: 'host',
    venueId: 'v1',
    golfFacilityId: 'f1',
    sido: '서울특별시',
    sigungu: '강남구',
    startHourKst: 19,
    participantUserIds: ['host', 'p2'],
    latitude: 37.5,
    longitude: 127.0,
    recruitClosesAt: '2026-09-04T10:00:00.000Z',
    hostAverageRating: null,
    hostReviewCount: 0,
    ...overrides,
  };
}

function baseCtx(
  overrides: Partial<RecommendUserContext> = {},
): RecommendUserContext {
  return {
    userId: 'me',
    followedFacilityIds: new Set(),
    pastAttendedVenueIds: new Set(),
    preferredHours: new Set(),
    regionPrefs: [],
    playedTogetherUserIds: new Set(),
    ...overrides,
  };
}

describe('recommendation eligibility', () => {
  it('excludes self-hosted, already joined, full, closed, completed, deadline passed', () => {
    assert.equal(
      isRecommendableJoin(baseCandidate({ hostUserId: 'me' }), 'me', now),
      false,
    );
    assert.equal(
      isRecommendableJoin(
        baseCandidate({ participantUserIds: ['me', 'host'] }),
        'me',
        now,
      ),
      false,
    );
    assert.equal(
      isRecommendableJoin(baseCandidate({ status: 'FULL' }), 'me', now),
      false,
    );
    assert.equal(
      isRecommendableJoin(baseCandidate({ status: 'CANCELLED' }), 'me', now),
      false,
    );
    assert.equal(
      isRecommendableJoin(baseCandidate({ status: 'COMPLETED' }), 'me', now),
      false,
    );
    assert.equal(
      isRecommendableJoin(
        baseCandidate({
          recruitClosesAt: '2026-09-02T10:00:00.000Z',
        }),
        'me',
        now,
      ),
      false,
    );
  });

  it('excludes gender-incompatible matching slots', () => {
    const c = baseCandidate({
      targetMaleCount: 2,
      targetFemaleCount: 2,
      confirmedGenders: ['MALE', 'MALE'],
      confirmedPlayerCount: 2,
      plannedPlayerCount: 4,
    });
    assert.equal(isRecommendableJoin(c, 'me', now, 'MALE'), false);
    assert.equal(isRecommendableJoin(c, 'me', now, 'FEMALE'), true);
  });
});

describe('recommendation scoring signals', () => {
  it('applies played host and participant with cap', () => {
    const c = baseCandidate({
      hostUserId: 'h1',
      participantUserIds: ['h1', 'a', 'b', 'c'],
    });
    const ctx = baseCtx({
      playedTogetherCounts: new Map([
        ['h1', 2],
        ['a', 3],
        ['b', 10],
        ['c', 1],
      ]),
      playedTogetherUserIds: new Set(['h1', 'a', 'b', 'c']),
    });
    const scored = scoreRecommendation(c, ctx, now)!;
    assert.ok(scored.signals.includes('PLAYED_TOGETHER_HOST'));
    assert.ok(scored.signals.includes('PLAYED_TOGETHER_PARTICIPANT'));
    const ptOnly = playedTogetherParticipantBonus(
      c.participantUserIds,
      c.hostUserId,
      ctx,
    );
    assert.ok(ptOnly <= RECOMMENDATION_WEIGHTS.playedTogetherParticipantCap);
    assert.equal(ptOnly, RECOMMENDATION_WEIGHTS.playedTogetherParticipantCap);
  });

  it('nearby buckets and no-location skip', () => {
    assert.equal(nearbyDistanceBonus(2500), RECOMMENDATION_WEIGHTS.nearbyLe3km);
    assert.equal(nearbyDistanceBonus(4000), RECOMMENDATION_WEIGHTS.nearbyLe5km);
    assert.equal(nearbyDistanceBonus(8000), RECOMMENDATION_WEIGHTS.nearbyLe10km);
    assert.equal(nearbyDistanceBonus(null), 0);

    const withLoc = scoreRecommendation(
      baseCandidate({ latitude: 37.501, longitude: 127.001 }),
      baseCtx({ viewerLatitude: 37.5, viewerLongitude: 127.0 }),
      now,
    )!;
    assert.ok(withLoc.signals.includes('NEARBY'));
    assert.ok((withLoc.distanceMeters ?? 0) > 0);

    const noLoc = scoreRecommendation(baseCandidate(), baseCtx(), now)!;
    assert.ok(!noLoc.signals.includes('NEARBY'));
  });

  it('almost filled remaining 1/2', () => {
    assert.equal(almostFilledBonus(4, 3).bonus, RECOMMENDATION_WEIGHTS.almostFilledRemaining1);
    assert.equal(almostFilledBonus(4, 2).bonus, RECOMMENDATION_WEIGHTS.almostFilledRemaining2);
    const scored = scoreRecommendation(
      baseCandidate({ plannedPlayerCount: 4, confirmedPlayerCount: 3 }),
      baseCtx(),
      now,
    )!;
    assert.ok(scored.signals.includes('ALMOST_FILLED'));
  });

  it('closing soon time buckets', () => {
    const todayDeadline = new Date('2026-09-03T06:00:00.000Z'); // KST Sep 3 15:00
    assert.equal(
      closingSoonBonus(todayDeadline, now),
      RECOMMENDATION_WEIGHTS.closingSoonToday,
    );
    const within24h = new Date('2026-09-04T00:00:00.000Z'); // ~21h later, not same KST day
    assert.equal(
      closingSoonBonus(within24h, now),
      RECOMMENDATION_WEIGHTS.closingSoon24h,
    );
  });

  it('host rating respects reviewCount threshold', () => {
    assert.equal(hostRatingBonus(5.0, 1), 0);
    const partial = hostRatingBonus(4.8, 3);
    const full = hostRatingBonus(4.8, 20);
    assert.ok(full > partial);
    assert.equal(full, RECOMMENDATION_WEIGHTS.hostRatingGe48);
    const mid = hostRatingBonus(4.5, 10);
    assert.equal(mid, RECOMMENDATION_WEIGHTS.hostRatingGe45);
  });

  it('frequent venue visit counts', () => {
    const scored = scoreRecommendation(
      baseCandidate({ venueId: 'v-fav' }),
      baseCtx({
        venueVisitCounts: new Map([['v-fav', 3]]),
        pastAttendedVenueIds: new Set(['v-fav']),
      }),
      now,
    )!;
    assert.ok(scored.signals.includes('FREQUENT_VENUE'));
  });

  it('cold start without history still returns fallback/nearby/deadline', () => {
    const scored = scoreRecommendation(
      baseCandidate({
        plannedPlayerCount: 4,
        confirmedPlayerCount: 3,
        recruitClosesAt: '2026-09-03T15:00:00.000Z',
        latitude: 37.501,
        longitude: 127.001,
      }),
      baseCtx({ viewerLatitude: 37.5, viewerLongitude: 127.0 }),
      now,
    )!;
    assert.ok(scored.score > 0);
    assert.ok(scored.reasons.length >= 1);
  });
});

describe('recommendation reasons', () => {
  it('caps reasons at 2 by priority', () => {
    const reasons = buildRecommendationReasons([
      'FREQUENT_VENUE',
      'PLAYED_TOGETHER_HOST',
      'ALMOST_FILLED',
      'NEARBY',
    ]);
    assert.deepEqual(reasons, ['PLAYED_TOGETHER_HOST', 'ALMOST_FILLED']);
  });

  it('strong alert requires played + almost filled', () => {
    assert.equal(
      isStrongRecommendationAlertSignal([
        'PLAYED_TOGETHER_HOST',
        'ALMOST_FILLED',
      ]),
      true,
    );
    assert.equal(isStrongRecommendationAlertSignal(['NEARBY']), false);
  });
});

describe('rankRecommendations', () => {
  it('ranks played-host above plain nearby and applies host diversity cap', () => {
    const ctx = baseCtx({
      playedTogetherCounts: new Map([['buddy', 4]]),
      playedTogetherUserIds: new Set(['buddy']),
      viewerLatitude: 37.5,
      viewerLongitude: 127.0,
    });
    const candidates = [
      baseCandidate({
        joinId: 'nearby-only',
        hostUserId: 'stranger',
        participantUserIds: ['stranger'],
        latitude: 37.501,
        longitude: 127.001,
      }),
      baseCandidate({
        joinId: 'played-host',
        hostUserId: 'buddy',
        participantUserIds: ['buddy'],
        plannedPlayerCount: 4,
        confirmedPlayerCount: 3,
        latitude: 37.501,
        longitude: 127.001,
        recruitClosesAt: '2026-09-03T08:00:00.000Z',
      }),
      baseCandidate({
        joinId: 'same-host-2',
        hostUserId: 'buddy',
        participantUserIds: ['buddy'],
        startAt: '2026-09-10T10:00:00.000Z',
        recruitClosesAt: '2026-09-10T08:00:00.000Z',
        latitude: 38.0,
        longitude: 128.0,
      }),
      baseCandidate({
        joinId: 'same-host-3',
        hostUserId: 'buddy',
        participantUserIds: ['buddy'],
        startAt: '2026-09-11T10:00:00.000Z',
        recruitClosesAt: '2026-09-11T08:00:00.000Z',
        latitude: 38.0,
        longitude: 128.0,
      }),
    ];
    const ranked = rankRecommendations(candidates, ctx, {
      limit: 10,
      now,
      maxPerHost: 2,
    });
    assert.ok(ranked.some((r) => r.joinId === 'played-host'));
    assert.equal(ranked[0]?.joinId, 'played-host');
    assert.ok(
      ranked[0]?.reasons.includes('PLAYED_TOGETHER_HOST') ||
        ranked[0]?.reason === 'PLAYED_TOGETHER_HOST',
    );
    const buddyCount = ranked.filter((r) =>
      ['played-host', 'same-host-2', 'same-host-3'].includes(r.joinId),
    ).length;
    assert.ok(buddyCount <= 2);
    assert.ok(!ranked.some((r) => r.joinId === 'same-host-3'));
  });
});
