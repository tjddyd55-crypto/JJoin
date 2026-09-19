import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  buildJoinCardCharacterTags,
  formatFieldExpectedCostLabel,
  JOIN_MEMBER_MAX_AGE,
  JOIN_MEMBER_MIN_AGE,
} from './index';

test('package.json points Metro at domain source, not stale dist', () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as {
    'react-native'?: string;
    exports?: { '.'?: { 'react-native'?: string; default?: string } };
  };
  assert.equal(pkg['react-native'], './src/index.ts');
  assert.equal(pkg.exports?.['.']?.['react-native'], './src/index.ts');
  assert.equal(pkg.exports?.['.']?.default, './dist/index.js');
});

test('domain barrel exports Home card helpers used by join-display', () => {
  assert.equal(typeof formatFieldExpectedCostLabel, 'function');
  assert.equal(typeof buildJoinCardCharacterTags, 'function');
  assert.equal(formatFieldExpectedCostLabel(70_000), '예상 70,000원');
  assert.equal(JOIN_MEMBER_MIN_AGE, 18);
  assert.equal(JOIN_MEMBER_MAX_AGE, 70);
});
