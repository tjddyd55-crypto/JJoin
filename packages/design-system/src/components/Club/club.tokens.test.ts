import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sizes } from '../../tokens/sizes';
import { radius } from '../../tokens/radius';

test('club cover list size matches Figma handoff', () => {
  assert.equal(sizes.clubCover.list, 84);
  assert.equal(radius.clubCover, 15);
});
