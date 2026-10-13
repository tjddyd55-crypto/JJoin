import assert from 'node:assert/strict';
import test from 'node:test';
import { DEV_ENTRY_LAUNCH_BACKGROUND } from './dev-entry-launch-timing';
import { DEVELOPMENT_SPLASH_BACKGROUND } from '../../../app-variant-identity.cjs';

test('DEV native splash background matches JS hero underlay', () => {
  assert.equal(DEVELOPMENT_SPLASH_BACKGROUND, DEV_ENTRY_LAUNCH_BACKGROUND);
});
