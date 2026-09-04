import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const screenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../app/join/[joinId]/index.tsx',
);

const FORBIDDEN_BODY_ACTIONS = [
  'label="내 조인"',
  'label="닫기"',
  'label="조인 상태 보기"',
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
