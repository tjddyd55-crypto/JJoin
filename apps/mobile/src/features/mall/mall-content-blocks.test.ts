import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('mall detail screen renders content block component', () => {
  const source = readFileSync(
    new URL('./screens/JoinMallProductDetailScreen.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /MallProductContentBlocks/);
  assert.match(source, /contentBlocks/);
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
