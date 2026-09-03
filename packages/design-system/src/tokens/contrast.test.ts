import assert from 'node:assert/strict';
import { test } from 'node:test';
import { palette, semanticColors } from '../tokens';

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

test('Fresh Lime CTA with Deep Navy text meets WCAG AA (>=4.5)', () => {
  const ratio = contrastRatio(palette.lime500, palette.deepNavy);
  assert.ok(ratio >= 4.5, `expected >=4.5, got ${ratio.toFixed(2)}`);
  assert.equal(semanticColors.text.onPrimary, palette.deepNavy);
  assert.notEqual(semanticColors.text.onPrimary, palette.white);
});
