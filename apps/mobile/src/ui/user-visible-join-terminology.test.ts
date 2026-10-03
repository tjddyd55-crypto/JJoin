import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const ROOT = join(import.meta.dirname, '../..');

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.expo') continue;
      collectTsFiles(full, out);
    } else if (/\.(tsx?)$/.test(name) && !name.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('user-visible terminology', () => {
  test('mobile app sources do not expose the legacy word 조인', () => {
    const files = collectTsFiles(join(ROOT, 'app')).concat(collectTsFiles(join(ROOT, 'src')));
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('조인')) offenders.push(file.replace(ROOT, ''));
    }
    assert.deepEqual(offenders, []);
  });
});
