import assert from 'node:assert/strict';
import test from 'node:test';
import { clampAppLaunchDurationMs } from './app-launch';

test('clampAppLaunchDurationMs enforces 500–5000ms window', () => {
  assert.equal(clampAppLaunchDurationMs(200), 500);
  assert.equal(clampAppLaunchDurationMs(2000), 2000);
  assert.equal(clampAppLaunchDurationMs(9000), 5000);
});
