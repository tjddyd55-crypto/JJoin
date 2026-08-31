/**
 * APP_VARIANT icon / identity SSOT — used by app.config.ts and regression tests.
 * CommonJS so Expo's app.config loader can require() it without a TS transpile step.
 * Production gold assets must never fall back to Development Expo defaults (or vice versa).
 */

/** @typedef {'development' | 'production'} AppVariant */

/** Development keeps legacy Expo default icons (side-by-side distinction). */
const DEVELOPMENT_APP_ICON = './assets/images/icon.png';
const DEVELOPMENT_ADAPTIVE_FOREGROUND =
  './assets/images/android-icon-foreground.png';
const DEVELOPMENT_ADAPTIVE_BACKGROUND_IMAGE =
  './assets/images/android-icon-background.png';
const DEVELOPMENT_ADAPTIVE_MONOCHROME =
  './assets/images/android-icon-monochrome.png';
/** Legacy Expo adaptive fill (teal) — DEV only. */
const DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR = '#0A6B56';

/**
 * Production launcher assets under assets/icons/.
 * - Full icon: opaque finished art for Expo `icon` / iOS.
 * - Foreground: transparent adaptive layer for Android (safe-padded).
 */
const PRODUCTION_APP_ICON = './assets/icons/jjoinzone-prod-icon.png';
const PRODUCTION_ADAPTIVE_FOREGROUND =
  './assets/icons/jjoinzone-prod-foreground-safe.png';
const PRODUCTION_ADAPTIVE_BACKGROUND_COLOR = '#09090A';

/**
 * @param {string | undefined} [appVariant]
 * @returns {AppVariant}
 */
function resolveAppVariant(appVariant = process.env.APP_VARIANT) {
  return appVariant === 'development' ? 'development' : 'production';
}

/**
 * @param {AppVariant} variant
 * @returns {string}
 */
function iconFor(variant) {
  return variant === 'development' ? DEVELOPMENT_APP_ICON : PRODUCTION_APP_ICON;
}

/**
 * @param {AppVariant} variant
 */
function androidAdaptiveIconFor(variant) {
  if (variant === 'development') {
    return {
      backgroundColor: DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR,
      foregroundImage: DEVELOPMENT_ADAPTIVE_FOREGROUND,
      backgroundImage: DEVELOPMENT_ADAPTIVE_BACKGROUND_IMAGE,
      monochromeImage: DEVELOPMENT_ADAPTIVE_MONOCHROME,
    };
  }
  return {
    backgroundColor: PRODUCTION_ADAPTIVE_BACKGROUND_COLOR,
    foregroundImage: PRODUCTION_ADAPTIVE_FOREGROUND,
  };
}

/**
 * @param {AppVariant} variant
 */
function identityFor(variant) {
  if (variant === 'development') {
    return {
      name: 'JJOINZONE DEV',
      slug: 'jjoin',
      scheme: 'jjoindev',
      androidPackage: 'com.jjoin.app.dev',
      iosBundleIdentifier: 'com.jjoin.app.dev',
    };
  }
  return {
    name: 'JJOINZONE',
    slug: 'jjoin',
    scheme: 'jjoin',
    androidPackage: 'com.jjoin.app',
    iosBundleIdentifier: 'com.jjoin.app',
  };
}

/**
 * @param {AppVariant} variant
 */
function notificationIconFor(variant) {
  if (variant === 'development') {
    return {
      icon: DEVELOPMENT_APP_ICON,
      color: DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR,
    };
  }
  return {
    icon: PRODUCTION_ADAPTIVE_FOREGROUND,
    color: PRODUCTION_ADAPTIVE_BACKGROUND_COLOR,
  };
}

module.exports = {
  DEVELOPMENT_APP_ICON,
  DEVELOPMENT_ADAPTIVE_FOREGROUND,
  DEVELOPMENT_ADAPTIVE_BACKGROUND_IMAGE,
  DEVELOPMENT_ADAPTIVE_MONOCHROME,
  DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR,
  PRODUCTION_APP_ICON,
  PRODUCTION_ADAPTIVE_FOREGROUND,
  PRODUCTION_ADAPTIVE_BACKGROUND_COLOR,
  resolveAppVariant,
  iconFor,
  androidAdaptiveIconFor,
  identityFor,
  notificationIconFor,
};
