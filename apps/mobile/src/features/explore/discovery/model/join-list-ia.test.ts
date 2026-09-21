import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseJoinListVenueTypeParam,
  resolveJoinListVenueType,
} from './discovery-filter';
import {
  JOIN_LIST_CARD_HEIGHT_ESTIMATE,
  JOIN_LIST_CHROME_AFTER,
  JOIN_LIST_CHROME_BEFORE,
  estimateFirstViewportCards,
  sumJoinListChrome,
} from './join-list-chrome';

const discoveryRoot = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(discoveryRoot, '../../../../../');

function readMobile(rel: string): string {
  return readFileSync(join(mobileRoot, rel), 'utf8');
}

test('route venueType locks SCREEN vs FIELD without a default toggle', () => {
  assert.equal(resolveJoinListVenueType(undefined), 'SCREEN');
  assert.equal(resolveJoinListVenueType('SCREEN'), 'SCREEN');
  assert.equal(resolveJoinListVenueType('FIELD'), 'FIELD');
  assert.equal(resolveJoinListVenueType(['FIELD']), 'FIELD');
  assert.equal(resolveJoinListVenueType('PARK'), 'SCREEN');
  assert.equal(parseJoinListVenueTypeParam(undefined), undefined);
  assert.equal(parseJoinListVenueTypeParam('FIELD'), 'FIELD');
});

test('joins tab passes route venueType into discovery', () => {
  const source = readMobile('app/(tabs)/joins.tsx');
  assert.match(source, /initialVenueType=\{venueType\}/);
  assert.match(source, /useLocalSearchParams/);
});

test('home and bottom paths still reach SCREEN and FIELD lists', () => {
  const home = readMobile('src/features/home/screens/HomeScreen.tsx');
  const quickMenu = readMobile('src/features/home/components/HomeQuickMenu.tsx');
  const tabs = readMobile('app/(tabs)/_layout.tsx');

  assert.match(home, /joinsListHref\('FIELD'\)/);
  assert.match(home, /joinsListHref\('SCREEN'\)/);
  assert.match(quickMenu, /venueType: 'SCREEN'/);
  assert.match(tabs, /name="joins"/);
  assert.match(tabs, /name="index"/);
  assert.match(tabs, /resolveTabPressParams/);
  assert.match(tabs, /shouldNavigateOnTabPress/);
  assert.doesNotMatch(tabs, /navigate\(route\.name, route\.params\)/);
});

test('join list does not global-reset venueType on every focus', () => {
  const provider = readMobile('src/features/explore/discovery/JoinDiscoveryContext.tsx');
  const joins = readMobile('app/(tabs)/joins.tsx');
  assert.doesNotMatch(provider, /useFocusEffect/);
  assert.doesNotMatch(joins, /useFocusEffect/);
  assert.match(provider, /parseJoinListVenueTypeParam/);
});

test('join list screen removes title and in-list SCREEN/FIELD toggle', () => {
  const screen = readMobile('src/features/explore/discovery/ExploreDiscoveryScreen.tsx');
  assert.doesNotMatch(screen, /스크린 조인/);
  assert.doesNotMatch(screen, /필드 조인/);
  assert.doesNotMatch(screen, /trackTabs/);
  assert.match(screen, /showTitle=\{false\}/);
  assert.match(screen, /density="compact"/);
  assert.match(screen, /label: '리스트'/);
  assert.match(screen, /label: '지역별'/);
});

test('provider only applies an explicit route venueType', () => {
  const source = readMobile('src/features/explore/discovery/JoinDiscoveryContext.tsx');
  assert.match(source, /parseJoinListVenueTypeParam/);
  assert.match(source, /resolveJoinListVenueType/);
  assert.doesNotMatch(source, /스크린 조인/);
});

test('sort row stays one compact row with short map action', () => {
  const source = readMobile(
    'src/features/explore/discovery/components/DiscoverListPanel.tsx',
  );
  assert.match(source, /flexWrap: 'nowrap'/);
  assert.match(source, /accessibilityLabel="지도에서 보기"/);
  assert.match(source, /name="map"/);
  assert.match(source, /\n\s+지도\n/);
  assert.doesNotMatch(source, /id: 'MAP'/);
  assert.match(source, /지금 진행 중/);
});

test('sort chips scroll horizontally while map stays a fixed trailing action', () => {
  const source = readMobile(
    'src/features/explore/discovery/components/DiscoverListPanel.tsx',
  );
  const chipsScroll = source.indexOf('filterChipsScroll');
  const mapAction = source.indexOf('accessibilityLabel="지도에서 보기"');
  const listRefresh = source.indexOf('RefreshControl');
  assert.ok(chipsScroll > 0 && chipsScroll < mapAction && mapAction < listRefresh);
  assert.match(source, /horizontal/);
  assert.match(source, /filterChipsScroll/);
  assert.match(source, /minWidth: 0/);
  assert.doesNotMatch(source, /filterSpacer/);
  assert.match(source, /flexWrap: 'nowrap'/);
});

test('discover list cards use compact padding without dropping fields', () => {
  const card = readMobile(
    'src/features/explore/discovery/components/DiscoverJoinCard.tsx',
  );
  assert.match(card, /variant: 'compact'/);
});

test('region chips stay a single horizontal row', () => {
  const source = readMobile(
    'src/features/explore/discovery/components/RegionQuickPicks.tsx',
  );
  assert.match(source, /horizontal/);
  assert.match(source, /flexWrap: 'nowrap'/);
  assert.doesNotMatch(source, /flexWrap: 'wrap'/);
});

test('date strip default height is about 70% of the previous card', () => {
  const source = readMobile(
    'src/features/explore/discovery/components/WeekStrip.tsx',
  );
  assert.match(source, /minHeight: 48/);
  assert.match(source, /height: 32/);
  assert.doesNotMatch(source, /minHeight: 68/);
  assert.doesNotMatch(source, /height: 50/);
});

test('join detail deep link path is unchanged', () => {
  const list = readMobile(
    'src/features/explore/discovery/components/DiscoverListPanel.tsx',
  );
  const push = readMobile(
    'src/features/notifications/use-push-registration.ts',
  );
  assert.match(list, /pathname: '\/join\/\[joinId\]'/);
  assert.match(push, /\/join\/\$\{target\.joinId\}/);
});

test('compact chrome leaves ~2.5 cards on a short first viewport', () => {
  const before = sumJoinListChrome(JOIN_LIST_CHROME_BEFORE);
  const after = sumJoinListChrome(JOIN_LIST_CHROME_AFTER);
  assert.equal(before, 364);
  assert.equal(after, 220);
  assert.ok(after / before <= 0.65);

  const beforeCards = estimateFirstViewportCards(before);
  const afterCards = estimateFirstViewportCards(after);
  assert.ok(beforeCards < 2);
  assert.ok(afterCards >= 2.5);
  assert.ok(JOIN_LIST_CARD_HEIGHT_ESTIMATE >= 130);
});
