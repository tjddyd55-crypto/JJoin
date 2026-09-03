import assert from 'node:assert/strict';
import { test } from 'node:test';
import { semanticColors } from './colors';
import { palette } from './palette';
import { sizes } from './sizes';

test('join host avatar sizes are defined for card layout', () => {
  assert.equal(sizes.avatar.joinHost, 56);
  assert.equal(sizes.avatar.joinHostLg, 64);
});

test('brand lime is not used as join card text color', () => {
  assert.notEqual(semanticColors.text.primary, palette.limeAccent);
  assert.notEqual(semanticColors.text.link, palette.limeAccent);
});
