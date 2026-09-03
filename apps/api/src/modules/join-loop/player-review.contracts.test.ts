import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertPlayerReviewRating,
  computePlayerReputation,
  evaluatePlayerReviewEligibility,
  normalizePlayerReviewComment,
  playedTogetherPairsFromAttendees,
} from '@jjoin/domain';
import { upsertPlayerReviewSchema } from '@jjoin/validation';

test('API review payload validates rating bounds', () => {
  assert.equal(upsertPlayerReviewSchema.safeParse({ revieweeUserId: 'not-uuid', rating: 5 }).success, false);
  assert.equal(
    upsertPlayerReviewSchema.safeParse({
      revieweeUserId: '11111111-1111-4111-8111-111111111111',
      rating: 5,
      comment: '좋아요',
    }).success,
    true,
  );
  assert.equal(
    upsertPlayerReviewSchema.safeParse({
      revieweeUserId: '11111111-1111-4111-8111-111111111111',
      rating: 0,
    }).success,
    false,
  );
});

test('domain eligibility matrix mirrors API contract', () => {
  assert.equal(
    evaluatePlayerReviewEligibility({
      reviewerUserId: 'a',
      revieweeUserId: 'b',
      joinStatus: 'COMPLETED',
      reviewerParticipationStatus: 'COMPLETED',
      revieweeParticipationStatus: 'COMPLETED',
    }).ok,
    true,
  );
  assert.equal(
    evaluatePlayerReviewEligibility({
      reviewerUserId: 'a',
      revieweeUserId: 'b',
      joinStatus: 'COMPLETED',
      reviewerParticipationStatus: 'COMPLETED',
      revieweeParticipationStatus: 'NO_SHOW',
    }).ok,
    false,
  );
  assert.equal(assertPlayerReviewRating(3), 3);
  assert.equal(normalizePlayerReviewComment(''), null);
  assert.equal(computePlayerReputation([5, 4]).averageRatingDisplay, '4.5');
  assert.equal(playedTogetherPairsFromAttendees(['a', 'b', 'c']).length, 3);
});
