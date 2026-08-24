import assert from 'node:assert/strict';
import { test } from 'node:test';
import { palette, semanticColors, layoutSpacing, sizes } from './index';
import { iconNames } from '../icons/iconTypes';

test('semantic colors map from Club Minimal palette', () => {
  assert.equal(semanticColors.app.background, palette.neutral950);
  assert.equal(semanticColors.action.primary, palette.gold500);
  assert.equal(semanticColors.text.primary, palette.neutral100);
});

test('layout spacing matches Figma handoff', () => {
  assert.equal(layoutSpacing.screenHorizontal, 20);
  assert.equal(layoutSpacing.cardGap, 12);
  assert.equal(layoutSpacing.sectionGap, 24);
});

test('primary CTA height token', () => {
  assert.equal(sizes.button.lg, 52);
});

test('icon registry includes bottom nav and phase 1B icons', () => {
  for (const name of [
    'home',
    'map',
    'create',
    'wallet',
    'profile',
    'golf',
    'people',
    'calendar',
    'currentLocation',
    'verified',
    'warning',
  ] as const) {
    assert.ok(iconNames.includes(name));
  }
});
