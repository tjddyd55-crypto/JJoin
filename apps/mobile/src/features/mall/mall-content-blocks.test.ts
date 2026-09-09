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

test('mall demo asset SSOT lists 8 realistic product image files', () => {
  const source = readFileSync(new URL('../../../../../scripts/demo-mall-assets.ts', import.meta.url), 'utf8');
  assert.match(source, /uv-cap-cover\.jpg/);
  assert.match(source, /golf-glove-cover\.jpg/);
  assert.match(source, /drink-coupon-cover\.jpg/);
  assert.match(source, /arm-sleeve-cover\.jpg/);
  assert.match(source, /towel-cover\.jpg/);
  assert.match(source, /golf-ball-cover\.jpg/);
  assert.match(source, /putting-mat-cover\.jpg/);
  assert.match(source, /screen-pass-cover\.jpg/);
  assert.match(source, /MALL_DEMO_PRODUCTS/);
  assert.match(source, /MALL_DEMO_SLUGS/);
});

test('mall content blocks preserve natural image aspect ratio', () => {
  const source = readFileSync(
    new URL('./components/MallProductContentBlocks.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /Image\.getSize/);
  assert.match(source, /aspectRatio/);
  assert.match(source, /resizeMode="contain"/);
  assert.doesNotMatch(source, /aspectRatio:\s*1\.2/);
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
