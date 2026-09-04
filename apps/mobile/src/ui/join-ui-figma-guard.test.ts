import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildJoinCardRewardLabel, formatJoinRewardTileValue } from './join-display';
import { buildJoinRecruitmentStatTiles } from './join-detail-display';
import type { JoinDetailDto } from '@jjoin/types';

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

const ROUTE_JOIN_CARD_SOURCES = [
  'src/features/explore/discovery/components/DiscoverJoinCard.tsx',
  'src/features/home/components/HomeTodaysJoinSection.tsx',
  'app/(tabs)/my-joins.tsx',
] as const;

const LEGACY_HOME_CARD_FILE = 'src/features/home/components/HomeJoinSections.tsx';

const FORBIDDEN_PATTERNS = [
  { file: 'src/features/explore/discovery/ExploreDiscoveryScreen.tsx', pattern: 'viewChip' },
  { file: 'src/features/explore/discovery/ExploreDiscoveryScreen.tsx', pattern: 'selectedBorder' },
  { file: 'app/join/[joinId]/index.tsx', pattern: 'title="DEV QA"' },
] as const;

test('buildJoinCardRewardLabel hides zero reward', () => {
  assert.equal(buildJoinCardRewardLabel('0'), null);
  assert.equal(buildJoinCardRewardLabel(0), null);
  assert.equal(buildJoinCardRewardLabel('+0'), null);
});

test('formatJoinRewardTileValue hides zero reward', () => {
  assert.equal(formatJoinRewardTileValue('0'), null);
});

test('recruitment stat grid always exposes four Figma tiles', () => {
  const detail = {
    plannedPlayerCount: 5,
    targetMaleCount: 2,
    targetFemaleCount: 2,
    minimumPlayers: 3,
    recruitClosesAt: null,
  } as JoinDetailDto;
  const tiles = buildJoinRecruitmentStatTiles(detail);
  assert.equal(tiles.length, 4);
  assert.deepEqual(
    tiles.map((t: { label: string }) => t.label),
    ['총 모집', '남성', '여성', '최소 확정'],
  );
});

test('join list routes render shared JoinCard', () => {
  for (const rel of ROUTE_JOIN_CARD_SOURCES) {
    const source = readFileSync(join(mobileRoot, rel), 'utf8');
    assert.match(source, /JoinCard/);
    assert.doesNotMatch(source, /<Button[^>]*label=\{join\.ctaLabel\}/);
  }
});

test('legacy HomeJoinSections file is removed', () => {
  assert.equal(existsSync(join(mobileRoot, LEGACY_HOME_CARD_FILE)), false);
});

test('home today section uses compact JoinCard mapper', () => {
  const source = readFileSync(
    join(mobileRoot, 'src/features/home/components/HomeTodaysJoinSection.tsx'),
    'utf8',
  );
  assert.match(source, /variant: 'compact'/);
  assert.doesNotMatch(source, /HomeTodayJoinRow|HomeRecommendedList|HomeUrgentJoinCard/);
});

test('explore discovery screen avoids legacy green outline tabs', () => {
  for (const item of FORBIDDEN_PATTERNS) {
    const source = readFileSync(join(mobileRoot, item.file), 'utf8');
    if (item.pattern === 'title="DEV QA"') {
      assert.match(source, /isJoinDetailDevPanelEnabled/);
      continue;
    }
    assert.equal(
      source.includes(item.pattern),
      false,
      `${item.file} must not include ${item.pattern}`,
    );
  }
});

test('discover list filter row uses map text action instead of chip', () => {
  const source = readFileSync(
    join(mobileRoot, 'src/features/explore/discovery/components/DiscoverListPanel.tsx'),
    'utf8',
  );
  assert.match(source, /filterSpacer/);
  assert.match(source, /지도에서 보기/);
  assert.doesNotMatch(source, /id: 'MAP'/);
});

test('join detail DEV QA requires explicit panel flag', () => {
  const source = readFileSync(join(mobileRoot, 'src/lib/join-detail-dev-tools.ts'), 'utf8');
  assert.match(source, /EXPO_PUBLIC_JOIN_DETAIL_DEV_PANEL/);
});

test('join tab uses JoinListTextTabs', () => {
  const source = readFileSync(
    join(mobileRoot, 'src/features/explore/discovery/ExploreDiscoveryScreen.tsx'),
    'utf8',
  );
  assert.match(source, /JoinListTextTabs/);
});

test('JoinCard title uses joinCardTitle token', () => {
  const dsRoot = join(mobileRoot, '../../packages/design-system/src/components/JoinCard/JoinCard.tsx');
  const source = readFileSync(dsRoot, 'utf8');
  assert.match(source, /variant="joinCardTitle"/);
});
