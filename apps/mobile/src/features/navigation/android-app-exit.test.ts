import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

describe('Android complete exit wiring', () => {
  test('double-back hook uses native complete exit', () => {
    const source = readFileSync(
      join(import.meta.dirname, 'useAndroidDoubleBackExit.tsx'),
      'utf8',
    );
    assert.match(source, /exitAndroidAppCompletely/);
    assert.doesNotMatch(source, /BackHandler\.exitApp\(\)/);
  });

  test('native module exposes exitCompletely', () => {
    const source = readFileSync(
      join(import.meta.dirname, '../../../modules/jjoin-app-exit/src/index.ts'),
      'utf8',
    );
    assert.match(source, /exitCompletely/);
  });
});
