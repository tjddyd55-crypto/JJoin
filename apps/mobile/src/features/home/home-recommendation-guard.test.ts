import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const mobileSrcRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('home venue join sections always render skeleton and empty copy', () => {
  const home = readFileSync(join(mobileSrcRoot, 'features/home/screens/HomeScreen.tsx'), 'utf8');
  const section = readFileSync(
    join(mobileSrcRoot, 'features/home/components/HomeVenueJoinSection.tsx'),
    'utf8',
  );
  const hook = readFileSync(join(mobileSrcRoot, 'features/home/hooks/useHomeData.ts'), 'utf8');

  assert.match(home, /HomeVenueJoinSection/);
  assert.match(section, /JoinCardSkeleton/);
  assert.match(section, /emptyMessage/);
  assert.match(hook, /isRefreshing/);
  assert.match(hook, /hasLoadedOnce/);
  assert.match(hook, /if \(seq !== loadSeqRef\.current\) return/);
  assert.doesNotMatch(hook, /getRecommendedJoins/);
});

test('app fonts bootstrap loads IBM Plex Sans KR token families', () => {
  const source = readFileSync(join(mobileSrcRoot, 'bootstrap/useAppFonts.ts'), 'utf8');
  assert.match(source, /IBMPlexSansKR_600SemiBold/);
  assert.match(source, /'IBMPlexSansKR-SemiBold'/);
});
