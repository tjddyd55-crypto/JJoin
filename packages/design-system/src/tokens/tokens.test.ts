import assert from 'node:assert/strict';
import { test } from 'node:test';
import { palette, semanticColors, premiumColors, layoutSpacing, sizes } from './index';
import { iconNames } from '../icons/iconTypes';

test('semantic colors use Navy-centered Bright Social Sports palette', () => {
  assert.equal(semanticColors.app.background, palette.warmWhite);
  assert.equal(semanticColors.action.primary, palette.deepNavy);
  assert.equal(semanticColors.text.primary, palette.deepNavy);
  assert.equal(semanticColors.text.onPrimary, palette.white);
  assert.equal(semanticColors.text.link, palette.infoBlue);
  assert.equal(semanticColors.brand.limeAccent, palette.limeAccent);
  assert.equal(semanticColors.navigation.active, palette.deepNavy);
  assert.equal(semanticColors.state.selectedText, palette.selectedText);
});

test('premium tokens keep archived Black & Gold', () => {
  assert.equal(premiumColors.background, palette.premiumBg);
  assert.equal(premiumColors.gold, palette.premiumGold);
  assert.equal(premiumColors.text, palette.premiumIvory);
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
