import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertPlayerReviewRating,
  computePlayerReputation,
  evaluatePlayerReviewEligibility,
  normalizePlayerReviewComment,
  playedTogetherPairsFromAttendees,
} from './player-review';

test('rating 1 and 5 pass; 0 and 6 fail', () => {
  assert.equal(assertPlayerReviewRating(1), 1);
  assert.equal(assertPlayerReviewRating(5), 5);
  assert.throws(() => assertPlayerReviewRating(0));
  assert.throws(() => assertPlayerReviewRating(6));
  assert.throws(() => assertPlayerReviewRating(4.5));
});

test('comment empty/whitespace → null; too long fails', () => {
  assert.equal(normalizePlayerReviewComment(undefined), null);
  assert.equal(normalizePlayerReviewComment('   '), null);
  assert.equal(normalizePlayerReviewComment('  재미있어요  '), '재미있어요');
  assert.throws(() => normalizePlayerReviewComment('x'.repeat(101)));
});

test('eligibility: COMPLETED pair only', () => {
  const base = {
    reviewerUserId: 'a',
    revieweeUserId: 'b',
    joinStatus: 'COMPLETED',
    reviewerParticipationStatus: 'COMPLETED',
    revieweeParticipationStatus: 'COMPLETED',
  };
  assert.equal(evaluatePlayerReviewEligibility(base).ok, true);
  assert.equal(
    evaluatePlayerReviewEligibility({ ...base, reviewerUserId: 'a', revieweeUserId: 'a' }).ok,
    false,
  );
  assert.equal(
    evaluatePlayerReviewEligibility({
      ...base,
      revieweeParticipationStatus: 'NO_SHOW',
    }).ok,
    false,
  );
  assert.equal(
    evaluatePlayerReviewEligibility({
      ...base,
      reviewerParticipationStatus: 'APPROVED',
    }).ok,
    false,
  );
  assert.equal(
    evaluatePlayerReviewEligibility({ ...base, joinStatus: 'OPEN' }).ok,
    false,
  );
});

test('aggregate averages to one decimal; commentless ratings count', () => {
  const agg = computePlayerReputation([5, 5, 4]);
  assert.equal(agg.reviewCount, 3);
  assert.equal(agg.averageRating, 4.7);
  assert.equal(agg.averageRatingDisplay, '4.7');
  assert.deepEqual(computePlayerReputation([]), {
    reviewCount: 0,
    averageRating: null,
    averageRatingDisplay: null,
  });
});

test('played-together pairs for 4 attendees', () => {
  const pairs = playedTogetherPairsFromAttendees(['a', 'b', 'c', 'd']);
  assert.equal(pairs.length, 6);
  assert.ok(pairs.every(([x, y]) => x < y));
  assert.equal(playedTogetherPairsFromAttendees(['a', 'a']).length, 0);
});
