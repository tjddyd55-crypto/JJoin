import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const mobileRoot = join(import.meta.dirname, '..', '..', '..');
const clubScreensDir = join(mobileRoot, 'src/features/club/screens');
const clubComponentsDir = join(mobileRoot, 'src/features/club/components');

const LIST_SCREENS = ['ClubDiscoverScreen.tsx', 'ClubRootScreen.tsx'];
const CONNECTED_SCREENS = [
  'ClubCreateScreen.tsx',
  'ClubEditScreen.tsx',
  'ClubMembersScreen.tsx',
  'ClubEventsScreen.tsx',
  'ClubNoticesScreen.tsx',
  'ClubAccountingScreen.tsx',
];

test('club discover and root screens use shared ClubCard', () => {
  for (const file of LIST_SCREENS) {
    const source = readFileSync(join(clubScreensDir, file), 'utf8');
    assert.match(source, /ClubCard/);
    assert.doesNotMatch(source, /ClubPlaceholderImage/);
  }
});

test('club home uses StickyActionFrame and ClubCover', () => {
  const source = readFileSync(join(clubScreensDir, 'ClubHomeScreen.tsx'), 'utf8');
  assert.match(source, /StickyActionFrame/);
  assert.match(source, /ClubCover/);
  assert.match(source, /stickyActionScrollPadding/);
});

test('club create and edit use ClubCover via ClubFormBody', () => {
  for (const file of ['ClubCreateScreen.tsx', 'ClubEditScreen.tsx']) {
    const source = readFileSync(join(clubScreensDir, file), 'utf8');
    assert.match(source, /ClubFormBody/);
    assert.doesNotMatch(source, /ClubPlaceholderImage/);
  }
});

test('ClubCoverPicker uses shared ClubCover', () => {
  const source = readFileSync(join(clubComponentsDir, 'ClubCoverPicker.tsx'), 'utf8');
  assert.match(source, /ClubCover/);
  assert.doesNotMatch(source, /ClubPlaceholderImage/);
});

test('connected club screens use Bright section components', () => {
  const expectations: Record<string, RegExp> = {
    'ClubMembersScreen.tsx': /ClubMemberRow/,
    'ClubEventsScreen.tsx': /ClubEventRow/,
    'ClubNoticesScreen.tsx': /ClubSection/,
    'ClubAccountingScreen.tsx': /ClubSection/,
  };
  for (const file of CONNECTED_SCREENS) {
    const source = readFileSync(join(clubScreensDir, file), 'utf8');
    assert.doesNotMatch(source, /ClubPlaceholderImage/);
    const pattern = expectations[file];
    if (pattern) assert.match(source, pattern);
  }
});
