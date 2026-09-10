import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

function readSibling(relativePath: string): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), relativePath), 'utf8');
}

test('mall home screen hides paused catalog rows', () => {
  const source = readSibling('./screens/JoinMallHomeScreen.tsx');
  assert.match(source, /purchaseState !== 'paused'/);
});

test('mall detail screen renders flat shopping layout with content blocks', () => {
  const source = readSibling('./screens/JoinMallProductDetailScreen.tsx');
  assert.match(source, /MallProductContentBlocks/);
  assert.match(source, /contentBlocks/);
  assert.match(source, /MallSectionDivider/);
  assert.doesNotMatch(source, /infoCard/);
  assert.doesNotMatch(source, /sectionCard/);
  assert.doesNotMatch(source, /productInfoRow/);
});

test('mall demo asset SSOT lists 8 realistic product image files', () => {
  const source = readSibling('../../../../../scripts/demo-mall-assets.ts');
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
  assert.match(source, /MallDemoProductImages/);
  assert.match(source, /images:\s*\{/);
});

test('mall content blocks preserve natural image aspect ratio', () => {
  const source = readSibling('./components/MallProductContentBlocks.tsx');
  assert.match(source, /Image\.getSize/);
  assert.match(source, /aspectRatio/);
  assert.match(source, /resizeMode="contain"/);
  assert.doesNotMatch(source, /aspectRatio:\s*1\.2/);
});

test('mall content blocks component supports HEADING TEXT IMAGE NOTICE', () => {
  const source = readSibling('./components/MallProductContentBlocks.tsx');
  assert.match(source, /MallContentBlockType\.HEADING/);
  assert.match(source, /MallContentBlockType\.TEXT/);
  assert.match(source, /MallContentBlockType\.IMAGE/);
  assert.match(source, /MallContentBlockType\.NOTICE/);
});
