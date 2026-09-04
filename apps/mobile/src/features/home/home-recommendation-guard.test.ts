import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const mobileSrcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('home recommendation section always renders and uses skeleton', () => {
  const home = readFileSync(join(mobileSrcRoot, 'features/home/screens/HomeScreen.tsx'), 'utf8');
  const section = readFileSync(
    join(mobileSrcRoot, 'features/home/components/HomeTodaysJoinSection.tsx'),
    'utf8',
  );
  const hook = readFileSync(join(mobileSrcRoot, 'features/home/hooks/useHomeData.ts'), 'utf8');

  assert.doesNotMatch(home, /showJoinSection/);
  assert.match(section, /JoinCardSkeleton/);
  assert.match(section, /오늘 조건에 맞는 추천 조인이 아직 없어요/);
  assert.match(hook, /isRefreshing/);
  assert.match(hook, /hasLoadedOnce/);
  assert.doesNotMatch(hook, /loadingToday: true,\s*\n\s*loadingRecommended: true/);
  assert.match(hook, /if \(seq !== loadSeqRef\.current\) return/);
});

test('app fonts bootstrap loads IBM Plex Sans KR token families', () => {
  const source = readFileSync(join(mobileSrcRoot, 'bootstrap/useAppFonts.ts'), 'utf8');
  assert.match(source, /IBMPlexSansKR_600SemiBold/);
  assert.match(source, /'IBMPlexSansKR-SemiBold'/);
});
