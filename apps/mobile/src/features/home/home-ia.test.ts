import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createDefaultDiscoveryFilter } from '@jjoin/domain';

const mobileSrcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('home main sections are field joins, screen joins, then users', () => {
  const home = readFileSync(join(mobileSrcRoot, 'features/home/screens/HomeScreen.tsx'), 'utf8');

  assert.match(home, /title="필드 조인"/);
  assert.match(home, /title="스크린 조인"/);
  assert.match(home, /title="함께할 사람"/);
  assert.doesNotMatch(home, /오늘의 추천 조인/);
  assert.doesNotMatch(home, /HomeTrackCtaRow/);
  assert.doesNotMatch(home, /HomeTodaysJoinSection/);

  const fieldIndex = home.indexOf('title="필드 조인"');
  const screenIndex = home.indexOf('title="스크린 조인"');
  const usersIndex = home.indexOf('title="함께할 사람"');
  assert.ok(fieldIndex < screenIndex && screenIndex < usersIndex);
});

test('home venue sections link to track-specific join lists', () => {
  const home = readFileSync(join(mobileSrcRoot, 'features/home/screens/HomeScreen.tsx'), 'utf8');
  assert.match(home, /joinsListHref\('FIELD'\)/);
  assert.match(home, /joinsListHref\('SCREEN'\)/);
  assert.equal(createDefaultDiscoveryFilter().venueType, 'SCREEN');
});

test('quick menu no longer owns create; track owns list+create', () => {
  const quickMenuLabels = ['조인 찾기', '쪼인몰', '스크린', '스크린 매장', '내 조인', '골프친구', '알림', '코인'];
  assert.equal(quickMenuLabels.includes('조인 만들기'), false);
  assert.equal(quickMenuLabels.includes('동호회'), false);
});

test('quick menu 조인 찾기 opens the SCREEN join list route', () => {
  const quickMenu = readFileSync(
    join(mobileSrcRoot, 'features/home/components/HomeQuickMenu.tsx'),
    'utf8',
  );
  assert.match(quickMenu, /venueType: 'SCREEN'/);
});
