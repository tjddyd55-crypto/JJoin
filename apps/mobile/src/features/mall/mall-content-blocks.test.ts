import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('mall detail screen renders flat shopping layout with content blocks', () => {
  const source = readFileSync(
    new URL('./screens/JoinMallProductDetailScreen.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /MallProductContentBlocks/);
  assert.match(source, /contentBlocks/);
  assert.match(source, /MallSectionDivider/);
  assert.doesNotMatch(source, /infoCard/);
  assert.doesNotMatch(source, /sectionCard/);
  assert.doesNotMatch(source, /productInfoRow/);
});

test('mall demo asset SSOT lists realistic product image files', () => {
  const source = readFileSync(new URL('../../../../../scripts/demo-mall-assets.ts', import.meta.url), 'utf8');
  assert.match(source, /uv-cap-cover\.jpg/);
  assert.match(source, /golf-glove-cover\.jpg/);
  assert.match(source, /drink-coupon-cover\.jpg/);
  assert.match(source, /MALL_DEMO_PRODUCTS/);
});

test('mall content blocks component supports HEADING TEXT IMAGE NOTICE', () => {
  const source = readFileSync(
    new URL('./components/MallProductContentBlocks.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /MallContentBlockType\.HEADING/);
  assert.match(source, /MallContentBlockType\.TEXT/);
  assert.match(source, /MallContentBlockType\.IMAGE/);
  assert.match(source, /MallContentBlockType\.NOTICE/);
});
