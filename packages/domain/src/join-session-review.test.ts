import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildJoinSessionReviewPhotoObjectKey,
  evaluateJoinSessionReviewAuthorEligibility,
  isJoinSessionReviewPhotoObjectKey,
} from './join-session-review';

test('join session review author requires finished join and confirmed participation', () => {
  const past = '2020-01-01T12:00:00.000Z';
  assert.equal(
    evaluateJoinSessionReviewAuthorEligibility({
      joinStatus: 'COMPLETED',
      scheduledEndAt: past,
      participationStatus: 'COMPLETED',
    }).ok,
    true,
  );
  assert.equal(
    evaluateJoinSessionReviewAuthorEligibility({
      joinStatus: 'CANCELLED',
      scheduledEndAt: past,
      participationStatus: 'COMPLETED',
    }).ok,
    false,
  );
  assert.equal(
    evaluateJoinSessionReviewAuthorEligibility({
      joinStatus: 'COMPLETED',
      scheduledEndAt: past,
      participationStatus: 'APPLIED',
    }).ok,
    false,
  );
});

test('join session review photo object key prefix is recognized for storage delete', () => {
  const key = buildJoinSessionReviewPhotoObjectKey({
    environmentPrefix: 'development',
    reviewId: '11111111-1111-4111-8111-111111111111',
    fileId: '22222222-2222-4222-8222-222222222222',
    extension: 'jpg',
  });
  assert.equal(
    isJoinSessionReviewPhotoObjectKey({ objectKey: key, environmentPrefix: 'development' }),
    true,
  );
  assert.equal(
    isJoinSessionReviewPhotoObjectKey({
      objectKey: 'development/profiles/u1/gallery/x.jpg',
      environmentPrefix: 'development',
    }),
    false,
  );
});
