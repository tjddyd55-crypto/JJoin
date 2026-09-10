import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveModalTopInset } from './resolve-modal-top-inset';

test('uses safe-area top when larger than status bar', () => {
  assert.equal(resolveModalTopInset(48, 24), 48);
});

test('falls back to Android status bar when safe-area top is 0', () => {
  assert.equal(resolveModalTopInset(0, 28), 28);
});

test('treats missing status bar height as 0', () => {
  assert.equal(resolveModalTopInset(12, null), 12);
  assert.equal(resolveModalTopInset(0, undefined), 0);
});

test('ignores invalid safe-top and uses status bar', () => {
  assert.equal(resolveModalTopInset(-8, 24), 24);
});
