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
const EAS_BUILD_PROFILE_CHANNELS = Object.freeze({
  development: EAS_UPDATE_CHANNELS.development,
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
  RUNTIME_VERSION_POLICY,
  UPDATES_CHECK_AUTOMATICALLY,
  UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS,
  updateChannelFor,
  updatesUrlFor,
  updatesConfigFor,
};
