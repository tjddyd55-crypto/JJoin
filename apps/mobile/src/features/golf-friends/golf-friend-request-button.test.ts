import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const screenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'screens/GolfFriendsScreen.tsx',
);

test('golf friend request button stays compact so the list text keeps the row', () => {
  const source = readFileSync(screenPath, 'utf8');
  assert.match(source, /label="친구요청"[\s\S]{0,180}fullWidth=\{false\}/);
  assert.match(source, /requestButton: \{ paddingHorizontal: 10, minHeight: 32 \}/);
  assert.match(source, /requestHit: \{ flexShrink: 0, justifyContent: 'center' \}/);
  assert.doesNotMatch(source, /label="친구요청"[\s\S]{0,120}fullWidth=\{true\}/);
});
