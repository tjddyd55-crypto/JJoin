import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const mobileSrcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('home is banner + two-column feature hub without preview lists', () => {
  const home = readFileSync(join(mobileSrcRoot, 'features/home/screens/HomeScreen.tsx'), 'utf8');

  assert.match(home, /<HomeBannerCarousel/);
  assert.match(home, /<HomeQuickMenu/);
  assert.doesNotMatch(home, /HomeVenueJoinSection/);
  assert.doesNotMatch(home, /HomeProfileDiscoverySection/);
  assert.doesNotMatch(home, /SectionHeader/);
  assert.doesNotMatch(home, /오늘의 추천 쪼인/);
});

test('home hub routes FIELD and SCREEN cards to track-specific lists', () => {
  const menu = readFileSync(
    join(mobileSrcRoot, 'features/home/components/HomeQuickMenu.tsx'),
    'utf8',
  );

  assert.match(menu, /label: '필드 쪼인'/);
  assert.match(menu, /venueType: 'FIELD'/);
  assert.match(menu, /label: '스크린 쪼인'/);
  assert.match(menu, /venueType: 'SCREEN'/);
});

test('home hub exposes one review entry and does not duplicate review creation', () => {
  const menu = readFileSync(
    join(mobileSrcRoot, 'features/home/components/HomeQuickMenu.tsx'),
    'utf8',
  );

  assert.equal((menu.match(/label: '쪼인 후기'/g) ?? []).length, 1);
  assert.match(menu, /href: '\/reviews'/);
  assert.doesNotMatch(menu, /label: '후기 작성'/);
});

test('home hub keeps the core destinations in two-column card order', () => {
  const menu = readFileSync(
    join(mobileSrcRoot, 'features/home/components/HomeQuickMenu.tsx'),
    'utf8',
  );
  const labels = ['필드 쪼인', '스크린 쪼인', '쪼인 후기', '쪼인몰', '골프친구', '스크린 매장', '내 쪼인', '코인'];

  let previous = -1;
  for (const label of labels) {
    const index = menu.indexOf(`label: '${label}'`);
    assert.ok(index > previous, `${label} must keep its home hub order`);
    previous = index;
  }

  assert.match(menu, /index \+= 2/);
  assert.doesNotMatch(menu, /label: '알림'/);
});
