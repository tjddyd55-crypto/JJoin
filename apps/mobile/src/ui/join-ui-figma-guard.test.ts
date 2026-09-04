import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

const FORBIDDEN_PATTERNS = [
  { file: 'src/features/explore/discovery/ExploreDiscoveryScreen.tsx', pattern: 'viewChip' },
  { file: 'src/features/explore/discovery/ExploreDiscoveryScreen.tsx', pattern: 'selectedBorder' },
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

test('explore discovery screen avoids legacy green outline tabs', () => {
  for (const item of FORBIDDEN_PATTERNS) {
    const source = readFileSync(join(mobileRoot, item.file), 'utf8');
    assert.equal(
      source.includes(item.pattern),
      false,
      `${item.file} must not include ${item.pattern}`,
    );
  }
});
