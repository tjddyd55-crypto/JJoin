import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateJoinSessionReviewAuthorEligibility } from './join-session-review';

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
