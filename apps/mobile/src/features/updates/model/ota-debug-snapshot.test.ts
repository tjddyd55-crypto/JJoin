import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatOtaDebugLines,
  formatOtaDebugValue,
  type OtaDebugSnapshot,
} from './ota-debug-snapshot';

const sample: OtaDebugSnapshot = {
  binaryVersion: '0.0.16',
  versionCode: 16,
  runtimeVersion: '0.0.16',
  updateId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  channel: 'development',
  gitSha: '376699b',
  appVariant: 'development',
  applicationId: 'com.jjoin.app.dev',
  isEmbeddedLaunch: true,
};

test('debug snapshot formats empty values as dashes', () => {
  assert.equal(formatOtaDebugValue(null), '—');
  assert.equal(formatOtaDebugValue(''), '—');
  assert.equal(formatOtaDebugValue(false), 'no');
  assert.equal(formatOtaDebugValue(true), 'yes');
  assert.equal(formatOtaDebugValue(16), '16');
});

test('debug lines stay in a stable operator order', () => {
  const lines = formatOtaDebugLines(sample);
  assert.deepEqual(
    lines.map((line) => line.label),
    [
      'APP_VARIANT',
      'applicationId',
      'version',
      'versionCode',
      'runtimeVersion',
      'channel',
      'updateId',
      'git SHA',
      'embedded',
    ],
  );
  assert.equal(lines[2]?.value, '0.0.16');
  assert.equal(lines[5]?.value, 'development');
});
