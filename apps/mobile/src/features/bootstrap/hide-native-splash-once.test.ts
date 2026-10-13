import assert from 'node:assert/strict';
import test from 'node:test';

test('hideNativeSplashOnce module exports a single-hide helper', async () => {
  const mod = await import('./hide-native-splash-once');
  assert.equal(typeof mod.hideNativeSplashOnce, 'function');
});
