import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEV_ENTRY_LAUNCH_MIN_MS,
  DEV_ENTRY_LAUNCH_SAFETY_MAX_MS,
} from './dev-entry-launch-timing';
import { shouldUseCustomLaunchHeroOverlay } from './DevEntryLaunchScreen';

test('DEV entry launch timing: 2s minimum, 4s safety cap', () => {
  assert.equal(DEV_ENTRY_LAUNCH_MIN_MS, 2000);
  assert.equal(DEV_ENTRY_LAUNCH_SAFETY_MAX_MS, 4000);
});

test('JS hero overlay only when admin cached image exists', () => {
  assert.equal(shouldUseCustomLaunchHeroOverlay(null), false);
  assert.equal(
    shouldUseCustomLaunchHeroOverlay({
      enabled: true,
      displayDurationMs: 2000,
      updatedAt: '',
      imageUri: null,
    }),
    false,
  );
  assert.equal(
    shouldUseCustomLaunchHeroOverlay({
      enabled: true,
      displayDurationMs: 2000,
      updatedAt: 'x',
      imageUri: 'file:///cache/hero.jpg',
    }),
    true,
  );
});
