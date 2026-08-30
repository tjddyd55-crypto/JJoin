import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldEnableInternalTools } from './internal-tools-policy';

test('production variant → mock controls absent', () => {
  assert.equal(
    shouldEnableInternalTools({
      appVariant: 'production',
      applicationId: 'com.jjoin.app',
    }),
    false,
  );
  assert.equal(
    shouldEnableInternalTools({
      appVariant: 'production',
      applicationId: 'com.jjoin.app.dev',
    }),
    false,
  );
});

test('development variant + DEV package → mock controls present', () => {
  assert.equal(
    shouldEnableInternalTools({
      appVariant: 'development',
      applicationId: 'com.jjoin.app.dev',
    }),
    true,
  );
});

test('development Metro env on Production package → still absent', () => {
  assert.equal(
    shouldEnableInternalTools({
      appVariant: 'development',
      applicationId: 'com.jjoin.app',
    }),
    false,
  );
});

test('missing variant on Production package → absent', () => {
  assert.equal(
    shouldEnableInternalTools({
      appVariant: undefined,
      applicationId: 'com.jjoin.app',
    }),
    false,
  );
});
