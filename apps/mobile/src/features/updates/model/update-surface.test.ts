import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveMandatoryBinaryDecision,
  resolveSoftOtaDecision,
  shouldForceMinSupportedBinary,
  UNSET_MIN_SUPPORTED_VERSION,
} from './update-surface';

test('soft OTA never prompts unless a bundle is already downloaded', () => {
  assert.deepEqual(
    resolveSoftOtaDecision({
      isEnabled: true,
      isUpdateAvailable: true,
      isUpdatePending: false,
      dismissedThisSession: false,
    }),
    { surface: 'soft_ota', action: 'download_in_background' },
  );
  assert.deepEqual(
    resolveSoftOtaDecision({
      isEnabled: true,
      isUpdateAvailable: true,
      isUpdatePending: true,
      dismissedThisSession: false,
    }),
    { surface: 'soft_ota', action: 'prompt_reload' },
  );
  assert.deepEqual(
    resolveSoftOtaDecision({
      isEnabled: true,
      isUpdateAvailable: true,
      isUpdatePending: true,
      dismissedThisSession: true,
    }),
    { surface: 'soft_ota', action: 'download_in_background' },
  );
});

test('disabled expo-updates is a no-op (Metro / web / missing native module)', () => {
  assert.deepEqual(
    resolveSoftOtaDecision({
      isEnabled: false,
      isUpdateAvailable: true,
      isUpdatePending: true,
      dismissedThisSession: false,
    }),
    { surface: 'soft_ota', action: 'none' },
  );
});

test('mandatory binary stays on versionCode and is not an OTA action', () => {
  assert.deepEqual(
    resolveMandatoryBinaryDecision({
      currentVersionCode: 16,
      publishedLatestVersionCode: 17,
      minSupportedVersionCode: null,
    }),
    { surface: 'mandatory_binary', action: 'force_store_or_apk' },
  );
  assert.deepEqual(
    resolveMandatoryBinaryDecision({
      currentVersionCode: 16,
      publishedLatestVersionCode: 16,
      minSupportedVersionCode: UNSET_MIN_SUPPORTED_VERSION.minSupportedVersionCode,
    }),
    { surface: 'mandatory_binary', action: 'none' },
  );
});

test('minSupportedVersion stub can force a binary without touching OTA', () => {
  assert.equal(shouldForceMinSupportedBinary(15, 16), true);
  assert.equal(shouldForceMinSupportedBinary(16, 16), false);
  assert.equal(shouldForceMinSupportedBinary(16, null), false);
  assert.deepEqual(
    resolveMandatoryBinaryDecision({
      currentVersionCode: 15,
      publishedLatestVersionCode: 0,
      minSupportedVersionCode: 16,
    }),
    { surface: 'mandatory_binary', action: 'force_store_or_apk' },
  );
});
