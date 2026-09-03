import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computePlayerReputation, formatAverageRating } from '@jjoin/domain';

test('mobile reputation display uses one decimal', () => {
  assert.equal(formatAverageRating(4), '4.0');
  assert.equal(formatAverageRating(4.86), '4.9');
  const empty = computePlayerReputation([]);
  assert.equal(empty.averageRatingDisplay, null);
  assert.equal(empty.reviewCount, 0);
});
