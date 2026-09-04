import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const mobileRoot = join(import.meta.dirname, '..', '..', '..');

test('club discover and root screens use shared ClubCard', () => {
  for (const file of ['ClubDiscoverScreen.tsx', 'ClubRootScreen.tsx']) {
    const source = readFileSync(join(mobileRoot, 'src/features/club/screens', file), 'utf8');
    assert.match(source, /ClubCard/);
    assert.doesNotMatch(source, /<Card[^>]*padding="md"[^>]*>\s*<Stack[^>]*>\s*<ClubPlaceholderImage/);
  }
});

test('club home uses StickyActionFrame and ClubCover', () => {
  const source = readFileSync(join(mobileRoot, 'src/features/club/screens/ClubHomeScreen.tsx'), 'utf8');
  assert.match(source, /StickyActionFrame/);
  assert.match(source, /ClubCover/);
  assert.match(source, /stickyActionScrollPadding/);
});
