/**
 * APP_VARIANT icon / identity SSOT — used by app.config.ts and regression tests.
 * CommonJS so Expo's app.config loader can require() it without a TS transpile step.
 * Production gold assets must never fall back to Development Expo defaults (or vice versa).
 */

/** @typedef {'development' | 'production'} AppVariant */

const WORDMARK_ICON = './assets/branding/jjoinzone-wordmark-primary.png';
/** Launcher/adaptive icon — same wordmark with safe-area padding (no crop). */
const WORDMARK_LAUNCHER_ICON = './assets/branding/jjoinzone-wordmark-launcher.png';

/** Development uses the same wordmark; DEV badge is in display name. */
const DEVELOPMENT_APP_ICON = WORDMARK_LAUNCHER_ICON;
const DEVELOPMENT_ADAPTIVE_FOREGROUND = WORDMARK_LAUNCHER_ICON;
const DEVELOPMENT_ADAPTIVE_BACKGROUND_IMAGE =
  './assets/images/android-icon-background.png';
const DEVELOPMENT_ADAPTIVE_MONOCHROME =
  './assets/images/android-icon-monochrome.png';
/** DEV adaptive fill — lime plate behind wordmark */
const DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR = '#A7E65B';

/**
 * Production launcher assets — 한글 쪼인존 wordmark (홀컵 심볼 제거).
 */
const PRODUCTION_APP_ICON = WORDMARK_LAUNCHER_ICON;
const PRODUCTION_ADAPTIVE_FOREGROUND = WORDMARK_LAUNCHER_ICON;
/** Wordmark plate — matches brand lime accent */
const PRODUCTION_ADAPTIVE_BACKGROUND_COLOR = '#FFFFFF';

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
      name: '쪼인존 DEV',
      slug: 'jjoin',
      scheme: 'jjoindev',
      androidPackage: 'com.jjoin.app.dev',
      iosBundleIdentifier: 'com.jjoin.app.dev',
    };
  }
  return {
    name: '쪼인존',
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
