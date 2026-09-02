import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveKeyboardBottomInset } from './keyboardBottomInset';

test('adjustResize: inset is clearance only (no full keyboard height)', () => {
  const inset = resolveKeyboardBottomInset({
    keyboardHeight: 400,
    keyboardTop: 1400,
    windowHeight: 1400,
    clearancePx: 72,
  });
  assert.equal(inset, 72);
});

test('overlay/adjustPan: inset includes real keyboard height + clearance', () => {
  const inset = resolveKeyboardBottomInset({
    keyboardHeight: 400,
    keyboardTop: 1400,
    windowHeight: 1800,
    clearancePx: 72,
  });
  assert.equal(inset, 472);
});

test('keyboard closed height yields zero inset', () => {
  assert.equal(
    resolveKeyboardBottomInset({
      keyboardHeight: 0,
      keyboardTop: 1800,
      windowHeight: 1800,
      clearancePx: 72,
    }),
    0,
  );
});
