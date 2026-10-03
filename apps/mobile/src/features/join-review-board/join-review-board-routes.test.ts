import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('home 쪼인 후기 opens community board route', () => {
  const menu = readFileSync(
    join(mobileRoot, 'features/home/components/HomeQuickMenu.tsx'),
    'utf8',
  );
  assert.match(menu, /label: '쪼인 후기'/);
  assert.match(menu, /href: '\/reviews'/);
  assert.doesNotMatch(menu, /join-session-reviews/);
});

test('legacy my join-session-reviews redirects to /reviews', () => {
  const legacy = readFileSync(join(mobileRoot, '../app/my/join-session-reviews.tsx'), 'utf8');
  assert.match(legacy, /Redirect/);
  assert.match(legacy, /\/reviews/);
});

test('join review board routes exist without joinId', () => {
  const files = [
    '../app/reviews/index.tsx',
    '../app/reviews/new.tsx',
    '../app/reviews/[reviewId]/index.tsx',
    '../app/reviews/[reviewId]/edit.tsx',
  ];
  for (const file of files) {
    const source = readFileSync(join(mobileRoot, file), 'utf8');
    assert.doesNotMatch(source, /joinId/);
  }
});
