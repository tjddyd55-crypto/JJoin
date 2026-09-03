import assert from 'node:assert/strict';
import { test } from 'node:test';
import { palette } from './palette';
import { semanticColors } from './colors';

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test('Primary CTA Navy/White meets WCAG AA', () => {
  const ratio = contrastRatio(palette.deepNavy, palette.white);
  assert.ok(ratio >= 4.5, `navy/white expected >=4.5, got ${ratio.toFixed(2)}`);
  assert.equal(semanticColors.text.onPrimary, palette.white);
  assert.equal(semanticColors.action.primary, palette.deepNavy);
});

test('Body text on Warm White background meets WCAG AA', () => {
  const ratio = contrastRatio(palette.deepNavy, palette.warmWhite);
  assert.ok(ratio >= 4.5, `primary/bg expected >=4.5, got ${ratio.toFixed(2)}`);
});

test('Secondary text on Warm White meets WCAG AA for large text threshold', () => {
  const ratio = contrastRatio(palette.secondaryText, palette.warmWhite);
  assert.ok(ratio >= 3, `secondary/bg expected >=3, got ${ratio.toFixed(2)}`);
});

test('Selected chip text on selected surface meets WCAG AA', () => {
  const ratio = contrastRatio(palette.selectedText, palette.selectedSurface);
  assert.ok(ratio >= 4.5, `selected text/surface expected >=4.5, got ${ratio.toFixed(2)}`);
});

test('Link text on Warm White meets WCAG AA', () => {
  const ratio = contrastRatio(palette.infoBlue, palette.warmWhite);
  assert.ok(ratio >= 4.5, `link/bg expected >=4.5, got ${ratio.toFixed(2)}`);
});

test('Active green on selected surface is readable', () => {
  const ratio = contrastRatio(palette.activeGreen, palette.selectedSurface);
  assert.ok(ratio >= 3, `active green on pale surface expected >=3, got ${ratio.toFixed(2)}`);
});

test('Brand lime accent is not used as primary CTA or body text color', () => {
  assert.notEqual(semanticColors.action.primary, palette.limeAccent);
  assert.notEqual(semanticColors.text.primary, palette.limeAccent);
  assert.notEqual(semanticColors.text.secondary, palette.limeAccent);
  assert.notEqual(semanticColors.navigation.active, palette.limeAccent);
});
