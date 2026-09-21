import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readAppVersionFromConfigSource } from './app-config-version';

test('reads Expo version and android versionCode from app.config source', () => {
  const parsed = readAppVersionFromConfigSource(`
    name: identity.name,
    version: '0.0.16',
    android: {
      versionCode: 16,
    },
  `);
  assert.deepEqual(parsed, { version: '0.0.16', versionCode: 16 });
});

test('fails closed when version is missing', () => {
  assert.throws(() => readAppVersionFromConfigSource('android: { versionCode: 16 }'), {
    message: 'app_config_version_missing',
  });
});

test('checked-in app.config.ts still exposes version for appVersion runtime policy', () => {
  const configPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../app.config.ts');
  const parsed = readAppVersionFromConfigSource(fs.readFileSync(configPath, 'utf8'));
  assert.match(parsed.version, /^\d+\.\d+\.\d+$/);
  assert.equal(typeof parsed.versionCode, 'number');
});
