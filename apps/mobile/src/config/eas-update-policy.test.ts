import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { identityFor } from '../../app-variant-identity.cjs';
import {
  EAS_BUILD_PROFILE_CHANNELS,
  EAS_UPDATE_CHANNELS,
  RUNTIME_VERSION_POLICY,
  STANDALONE_DEV_BUILD_PROFILE,
  UPDATES_CHECK_AUTOMATICALLY,
  UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS,
  shouldIncludeExpoDevClient,
  updateChannelFor,
  updatesConfigFor,
  updatesUrlFor,
} from '../../eas-update-policy.cjs';

const PROJECT_ID = '7882917d-f3be-4832-bb62-754702a7d205';

test('runtime policy is appVersion and never blocks launch', () => {
  assert.deepEqual(RUNTIME_VERSION_POLICY, { policy: 'appVersion' });
  assert.equal(UPDATES_CHECK_AUTOMATICALLY, 'ON_LOAD');
  assert.equal(UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS, 0);
});

test('variant identity stays isolated while channels stay mapped', () => {
  const production = identityFor('production');
  const development = identityFor('development');
  assert.equal(production.androidPackage, 'com.jjoin.app');
  assert.equal(production.name, '쪼인존');
  assert.equal(production.scheme, 'jjoin');
  assert.equal(development.androidPackage, 'com.jjoin.app.dev');
  assert.equal(development.name, '쪼인존 DEV');
  assert.equal(development.scheme, 'jjoindev');
  assert.equal(updateChannelFor('production'), EAS_UPDATE_CHANNELS.production);
  assert.equal(updateChannelFor('development'), EAS_UPDATE_CHANNELS.development);
});

test('preview binaries share the production channel, never development', () => {
  assert.equal(EAS_BUILD_PROFILE_CHANNELS.development, 'development');
  assert.equal(EAS_BUILD_PROFILE_CHANNELS[STANDALONE_DEV_BUILD_PROFILE], 'development');
  assert.equal(EAS_BUILD_PROFILE_CHANNELS.preview, 'production');
  assert.equal(EAS_BUILD_PROFILE_CHANNELS.production, 'production');
});

test('eas.json build profiles pin channels; eas-cli 24 forbids a top-level update key', () => {
  const easPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../eas.json');
  const eas = JSON.parse(fs.readFileSync(easPath, 'utf8')) as {
    build: Record<
      string,
      {
        channel?: string;
        developmentClient?: boolean;
        distribution?: string;
        environment?: string;
        env?: Record<string, string>;
        android?: { buildType?: string };
      }
    >;
    update?: unknown;
  };
  assert.equal(eas.build.development.channel, EAS_BUILD_PROFILE_CHANNELS.development);
  assert.equal(eas.build.development.developmentClient, true);
  assert.equal(eas.build.preview.channel, EAS_BUILD_PROFILE_CHANNELS.preview);
  assert.equal(eas.build.production.channel, EAS_BUILD_PROFILE_CHANNELS.production);
  assert.equal(eas.update, undefined);

  const standalone = eas.build[STANDALONE_DEV_BUILD_PROFILE];
  assert.equal(standalone.channel, 'development');
  assert.equal(standalone.developmentClient, false);
  assert.equal(standalone.distribution, 'internal');
  assert.equal(standalone.environment, 'development');
  assert.equal(standalone.env?.APP_VARIANT, 'development');
  assert.equal(
    standalone.env?.EXPO_PUBLIC_API_URL,
    'https://api-development-e387.up.railway.app',
  );
  assert.equal(standalone.env?.EXPO_PUBLIC_USE_DEV_CLIENT, 'false');
  assert.equal(standalone.android?.buildType, 'apk');
});

test('expo-dev-client plugin is Metro/development only, never standalone DEV', () => {
  assert.equal(shouldIncludeExpoDevClient({ variant: 'production' }), false);
  assert.equal(shouldIncludeExpoDevClient({ variant: 'development' }), true);
  assert.equal(
    shouldIncludeExpoDevClient({ variant: 'development', easBuildProfile: 'development' }),
    true,
  );
  assert.equal(
    shouldIncludeExpoDevClient({
      variant: 'development',
      easBuildProfile: STANDALONE_DEV_BUILD_PROFILE,
    }),
    false,
  );
  assert.equal(
    shouldIncludeExpoDevClient({ variant: 'development', useDevClient: 'false' }),
    false,
  );
});

test('updates.url and expo-channel-name header follow the EAS project + variant', () => {
  const development = updatesConfigFor('development', PROJECT_ID);
  const production = updatesConfigFor('production', PROJECT_ID);
  assert.equal(development.url, updatesUrlFor(PROJECT_ID));
  assert.equal(development.url, `https://u.expo.dev/${PROJECT_ID}`);
  assert.equal(development.requestHeaders['expo-channel-name'], 'development');
  assert.equal(production.requestHeaders['expo-channel-name'], 'production');
  assert.equal(development.fallbackToCacheTimeout, 0);
});
