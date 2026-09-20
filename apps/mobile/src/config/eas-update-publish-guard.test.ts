import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectProductionDevClues,
  evaluatePublishGuard,
  normalizeEasUpdateChannel,
  PRODUCTION_PUBLISH_ALLOWED_BRANCHES,
} from './eas-update-publish-guard';

const cleanMain = {
  branch: 'main',
  dirty: false,
  headSha: 'abc1234',
} as const;

test('normalizeEasUpdateChannel accepts only development|production', () => {
  assert.equal(normalizeEasUpdateChannel('development'), 'development');
  assert.equal(normalizeEasUpdateChannel('production'), 'production');
  assert.equal(normalizeEasUpdateChannel('preview'), null);
  assert.equal(normalizeEasUpdateChannel(''), null);
});

test('DEV publish is allowed on a dirty feature branch', () => {
  const result = evaluatePublishGuard({
    channel: 'development',
    git: { branch: 'cursor/eas-update-ota-cd14', dirty: true, headSha: 'deadbeef' },
    allowProductionPublish: false,
    dryRun: false,
    binaryRebuildRequired: false,
    allowBinaryMismatch: false,
  });
  assert.equal(result.channel, 'development');
  assert.equal(result.canPublish, true);
  assert.equal(
    result.issues.some((issue) => issue.code === 'DIRTY_TREE' && issue.level === 'warning'),
    true,
  );
});

test('DEV publish warns on native changes but still allows OTA', () => {
  const result = evaluatePublishGuard({
    channel: 'development',
    git: cleanMain,
    allowProductionPublish: false,
    dryRun: false,
    binaryRebuildRequired: true,
    allowBinaryMismatch: false,
  });
  assert.equal(result.canPublish, true);
  assert.equal(
    result.issues.some((issue) => issue.code === 'BINARY_REBUILD_REQUIRED'),
    true,
  );
});

test('production dry-run never publishes without operator flags', () => {
  const result = evaluatePublishGuard({
    channel: 'production',
    git: cleanMain,
    allowProductionPublish: false,
    dryRun: true,
    binaryRebuildRequired: false,
    allowBinaryMismatch: false,
  });
  assert.equal(result.channel, 'production');
  assert.equal(result.canPublish, true);
  assert.equal(
    result.issues.some((issue) => issue.code === 'PRODUCTION_CONFIRM_REQUIRED'),
    true,
  );
});

test('production real publish refuses dirty tree, non-main, and missing confirm', () => {
  const result = evaluatePublishGuard({
    channel: 'production',
    git: { branch: 'feat/ota', dirty: true, headSha: 'ffff' },
    allowProductionPublish: false,
    dryRun: false,
    binaryRebuildRequired: false,
    allowBinaryMismatch: false,
  });
  assert.equal(result.canPublish, false);
  const codes = result.issues.filter((issue) => issue.level === 'error').map((issue) => issue.code);
  assert.deepEqual(codes.sort(), [
    'BRANCH_NOT_ALLOWED',
    'DIRTY_TREE',
    'PRODUCTION_CONFIRM_REQUIRED',
  ]);
});

test('production real publish refuses APP_VARIANT/dev clues even on main', () => {
  const result = evaluatePublishGuard({
    channel: 'production',
    git: cleanMain,
    appVariant: 'development',
    extraDevClues: ['EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED is enabled'],
    allowProductionPublish: true,
    dryRun: false,
    binaryRebuildRequired: false,
    allowBinaryMismatch: false,
  });
  assert.equal(result.canPublish, false);
  assert.equal(result.issues.filter((issue) => issue.code === 'DEV_CLUE').length, 2);
});

test('production real publish refuses native changes unless overridden', () => {
  const blocked = evaluatePublishGuard({
    channel: 'production',
    git: cleanMain,
    allowProductionPublish: true,
    dryRun: false,
    binaryRebuildRequired: true,
    allowBinaryMismatch: false,
  });
  assert.equal(blocked.canPublish, false);
  const allowed = evaluatePublishGuard({
    channel: 'production',
    git: cleanMain,
    allowProductionPublish: true,
    dryRun: false,
    binaryRebuildRequired: true,
    allowBinaryMismatch: true,
  });
  assert.equal(allowed.canPublish, true);
});

test('collectProductionDevClues is fail-closed on explicit DEV env', () => {
  assert.deepEqual(
    collectProductionDevClues({
      APP_VARIANT: 'development',
      EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED: 'true',
      EAS_UPDATE_CHANNEL: 'development',
    }),
    [
      'APP_VARIANT=development',
      'EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED is enabled',
      'EAS_UPDATE_CHANNEL=development',
    ],
  );
  assert.deepEqual(
    collectProductionDevClues({
      APP_VARIANT: 'production',
      EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED: 'false',
    }),
    [],
  );
});

test('allowed production branch SSOT is main only', () => {
  assert.deepEqual([...PRODUCTION_PUBLISH_ALLOWED_BRANCHES], ['main']);
});
