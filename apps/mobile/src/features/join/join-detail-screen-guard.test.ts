import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const screenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../app/join/[joinId]/index.tsx',
);
const sectionsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'components/JoinDetailPrimarySections.tsx',
);
const fieldSummaryPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'components/FieldJoinDetailSummarySurface.tsx',
);

const FORBIDDEN_BODY_ACTIONS = [
  'label="내 조인"',
  'label="닫기"',
  'label="조인 상태 보기"',
  'label="뒤로"',
] as const;

test('join detail screen body excludes duplicate navigation actions', () => {
  const source = readFileSync(screenPath, 'utf8');
  for (const pattern of FORBIDDEN_BODY_ACTIONS) {
    assert.equal(
      source.includes(pattern),
      false,
      `join detail screen must not include ${pattern}`,
    );
  }
});

test('join detail screen removes AppBar and uses hardware back fallback', () => {
  const source = readFileSync(screenPath, 'utf8');
  assert.doesNotMatch(source, /<AppBar/);
  assert.doesNotMatch(source, /title="조인 상세"/);
  assert.match(source, /BackHandler\.addEventListener\('hardwareBackPress'/);
  assert.match(source, /router\.replace\('\/\(tabs\)\/joins'\)/);
});

test('join detail keeps bookmark and share compact header actions', () => {
  const sections = readFileSync(sectionsPath, 'utf8');
  assert.match(sections, /onToggleBookmark/);
  assert.match(sections, /onShare/);
  assert.match(sections, /headerActionHit/);
  assert.match(sections, /minWidth: 44/);
});

test('FIELD detail core info is a single surface without nested scan card', () => {
  const sections = readFileSync(sectionsPath, 'utf8');
  const fieldSummary = readFileSync(fieldSummaryPath, 'utf8');
  assert.doesNotMatch(sections, /한눈에 보기/);
  assert.doesNotMatch(sections, /buildFieldJoinScanRows/);
  assert.match(sections, /FieldJoinDetailSummarySurface/);
  assert.match(sections, /buildFieldJoinDetailSummary/);
  assert.doesNotMatch(fieldSummary, /한눈에 보기/);
  assert.doesNotMatch(fieldSummary, /surface\.soft/);
  assert.doesNotMatch(fieldSummary, /JoinDetailCard/);
});
