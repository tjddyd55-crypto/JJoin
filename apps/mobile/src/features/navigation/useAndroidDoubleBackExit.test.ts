import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { resolveAndroidDoubleBackExitAction } from './android-double-back-exit-logic';

describe('Android double-back exit', () => {
  test('delegates to navigation when stack can go back', () => {
    assert.equal(
      resolveAndroidDoubleBackExitAction({ canGoBack: true, now: 0, lastBackAt: 0 }),
      'navigate',
    );
  });

  test('first back within window shows hint', () => {
    assert.equal(
      resolveAndroidDoubleBackExitAction({ canGoBack: false, now: 1000, lastBackAt: 0 }),
      'hint',
    );
  });

  test('second back within 2000ms exits', () => {
    assert.equal(
      resolveAndroidDoubleBackExitAction({ canGoBack: false, now: 2500, lastBackAt: 1000 }),
      'exit',
    );
  });

  test('back after window resets to hint', () => {
    assert.equal(
      resolveAndroidDoubleBackExitAction({ canGoBack: false, now: 4000, lastBackAt: 1000 }),
      'hint',
    );
  });
});
