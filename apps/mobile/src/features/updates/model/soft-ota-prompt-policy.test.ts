import assert from 'node:assert/strict';
import test from 'node:test';
import {
  shouldAutoReloadOnLaunch,
  shouldBlockAppEntryForOta,
  shouldShowSoftOtaPrompt,
} from './soft-ota-prompt-policy';

test('soft OTA prompt is optional and session-dismissible', () => {
  assert.equal(
    shouldShowSoftOtaPrompt({ isUpdatePending: true, dismissedThisSession: false }),
    true,
  );
  assert.equal(
    shouldShowSoftOtaPrompt({ isUpdatePending: true, dismissedThisSession: true }),
    false,
  );
  assert.equal(
    shouldShowSoftOtaPrompt({ isUpdatePending: false, dismissedThisSession: false }),
    false,
  );
});

test('OTA must not auto-reload or block app entry', () => {
  assert.equal(shouldAutoReloadOnLaunch(), false);
  assert.equal(shouldBlockAppEntryForOta(), false);
});
