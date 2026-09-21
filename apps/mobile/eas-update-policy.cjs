/**
 * EAS Update channel / runtime SSOT — used by app.config.ts, publish guards, tests.
 * CommonJS so Expo's app.config loader can require() it without a TS transpile step.
 *
 * Isolation (forever):
 * - Development identity (com.jjoin.app.dev) → channel `development`
 * - Production identity (com.jjoin.app), including preview binaries → channel `production`
 * Channels + requestHeaders keep DEV OTA off Production binaries and vice versa.
 */

/** @typedef {'development' | 'production'} AppVariant */
/** @typedef {'development' | 'production'} EasUpdateChannel */

const EAS_UPDATE_CHANNELS = Object.freeze({
  development: 'development',
  production: 'production',
});

/**
 * Build profile → channel. Preview ships Production identity, so it shares
 * the production channel (never the development channel).
 */
const STANDALONE_DEV_BUILD_PROFILE = 'development-standalone';

const EAS_BUILD_PROFILE_CHANNELS = Object.freeze({
  development: EAS_UPDATE_CHANNELS.development,
  [STANDALONE_DEV_BUILD_PROFILE]: EAS_UPDATE_CHANNELS.development,
  preview: EAS_UPDATE_CHANNELS.production,
  production: EAS_UPDATE_CHANNELS.production,
});

/** @type {{ policy: 'appVersion' }} */
const RUNTIME_VERSION_POLICY = Object.freeze({ policy: 'appVersion' });

const UPDATES_CHECK_AUTOMATICALLY = 'ON_LOAD';
/** Do not block app entry waiting for a remote bundle. */
const UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS = 0;

/**
 * @param {AppVariant} variant
 * @returns {EasUpdateChannel}
 */
function updateChannelFor(variant) {
  return variant === 'development'
    ? EAS_UPDATE_CHANNELS.development
    : EAS_UPDATE_CHANNELS.production;
}

function isExplicitlyDisabledFlag(value) {
  if (value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'false' || normalized === '0' || normalized === 'no';
}

/**
 * expo-dev-client / Dev Launcher plugin.
 * Production identity never includes it.
 * Local Metro and EAS `development` include it.
 * EAS `development-standalone` (or EXPO_PUBLIC_USE_DEV_CLIENT=false) does not.
 *
 * @param {{
 *   variant: AppVariant,
 *   easBuildProfile?: string,
 *   useDevClient?: string,
 * }} input
 * @returns {boolean}
 */
function shouldIncludeExpoDevClient(input) {
  if (input.variant !== 'development') return false;
  if (isExplicitlyDisabledFlag(input.useDevClient)) return false;
  const profile = (input.easBuildProfile ?? '').trim();
  return profile !== STANDALONE_DEV_BUILD_PROFILE;
}

/**
 * @param {string} projectId
 * @returns {string}
 */
function updatesUrlFor(projectId) {
  return `https://u.expo.dev/${projectId}`;
}

/**
 * @param {AppVariant} variant
 * @param {string} projectId
 */
function updatesConfigFor(variant, projectId) {
  return {
    url: updatesUrlFor(projectId),
    checkAutomatically: UPDATES_CHECK_AUTOMATICALLY,
    fallbackToCacheTimeout: UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS,
    requestHeaders: {
      'expo-channel-name': updateChannelFor(variant),
    },
  };
}

module.exports = {
  EAS_UPDATE_CHANNELS,
  EAS_BUILD_PROFILE_CHANNELS,
  STANDALONE_DEV_BUILD_PROFILE,
  RUNTIME_VERSION_POLICY,
  UPDATES_CHECK_AUTOMATICALLY,
  UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS,
  updateChannelFor,
  updatesUrlFor,
  updatesConfigFor,
  shouldIncludeExpoDevClient,
};
