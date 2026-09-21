import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectBinaryRebuildMatches,
  formatBinaryRebuildReport,
  isBinaryRebuildPath,
} from './binary-rebuild-required';

test('JS/TS screen changes are OTA-safe', () => {
  assert.equal(isBinaryRebuildPath('apps/mobile/src/features/home/HomeScreen.tsx'), false);
  assert.equal(isBinaryRebuildPath('apps/mobile/app/(tabs)/index.tsx'), false);
  assert.equal(isBinaryRebuildPath('docs/mobile-update-runbook.md'), false);
});

test('native, plugin, and identity config changes require a binary', () => {
  const paths = [
    'apps/mobile/android/app/src/main/AndroidManifest.xml',
    'apps/mobile/ios/jjoin/Info.plist',
    'apps/mobile/plugins/with-toss-payment-queries.js',
    'apps/mobile/modules/jjoin-kakao-map/app.plugin.js',
    'apps/mobile/app.config.ts',
    'apps/mobile/app-variant-identity.cjs',
    'apps/mobile/eas.json',
    'apps/mobile/package.json',
    'apps/mobile/firebase/google-services.production.json',
  ];
  for (const filePath of paths) {
    assert.equal(isBinaryRebuildPath(filePath), true, filePath);
  }
});

test('collectBinaryRebuildMatches de-dupes and formats the operator banner', () => {
  const matches = collectBinaryRebuildMatches([
    'apps/mobile/app/(tabs)/my.tsx',
    'apps/mobile/package.json',
    'apps/mobile/package.json',
    'apps/mobile/plugins/with-toss-payment-queries.js',
  ]);
  assert.equal(matches.length, 2);
  const report = formatBinaryRebuildReport(matches);
  assert.match(report, /BINARY_REBUILD_REQUIRED/);
  assert.match(report, /package\.json/);
  assert.equal(formatBinaryRebuildReport([]), 'OTA_SAFE: no binary-rebuild path signals');
});
