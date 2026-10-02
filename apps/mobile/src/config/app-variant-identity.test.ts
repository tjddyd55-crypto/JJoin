import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR,
  DEVELOPMENT_ADAPTIVE_FOREGROUND,
  DEVELOPMENT_APP_ICON,
  PRODUCTION_ADAPTIVE_BACKGROUND_COLOR,
  PRODUCTION_ADAPTIVE_FOREGROUND,
  PRODUCTION_APP_ICON,
  androidAdaptiveIconFor,
  iconFor,
  identityFor,
  notificationIconFor,
  resolveAppVariant,
  splashScreenFor,
  expoSplashPluginConfigFor,
  DEVELOPMENT_SPLASH_IMAGE,
} from '../../app-variant-identity.cjs';

test('resolveAppVariant: only explicit development selects DEV', () => {
  assert.equal(resolveAppVariant('development'), 'development');
  assert.equal(resolveAppVariant('production'), 'production');
  assert.equal(resolveAppVariant(''), 'production');
  assert.equal(resolveAppVariant('staging'), 'production');
});

test('production identity uses wordmark icons and com.jjoin.app', () => {
  const id = identityFor('production');
  assert.equal(id.name, '쪼인존');
  assert.equal(id.androidPackage, 'com.jjoin.app');
  assert.equal(iconFor('production'), PRODUCTION_APP_ICON);
  const adaptive = androidAdaptiveIconFor('production');
  assert.equal(adaptive.foregroundImage, PRODUCTION_ADAPTIVE_FOREGROUND);
  assert.equal(adaptive.backgroundColor, PRODUCTION_ADAPTIVE_BACKGROUND_COLOR);
  assert.equal(adaptive.backgroundImage, undefined);
  assert.equal(adaptive.monochromeImage, undefined);
});

test('development identity uses wordmark icons and com.jjoin.app.dev', () => {
  const id = identityFor('development');
  assert.equal(id.name, '쪼인존 DEV');
  assert.equal(id.androidPackage, 'com.jjoin.app.dev');
  assert.equal(iconFor('development'), DEVELOPMENT_APP_ICON);
  const adaptive = androidAdaptiveIconFor('development');
  assert.equal(adaptive.foregroundImage, DEVELOPMENT_ADAPTIVE_FOREGROUND);
  assert.equal(adaptive.backgroundColor, DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR);
  assert.equal(iconFor('development'), iconFor('production'));
});

test('development splash uses hero launch image; production keeps wordmark splash', () => {
  const dev = splashScreenFor('development');
  assert.equal(dev.image, DEVELOPMENT_SPLASH_IMAGE);
  assert.equal(dev.resizeMode, 'cover');
  const prod = splashScreenFor('production');
  assert.equal(prod.image, './assets/images/splash-icon.png');
  assert.equal(prod.resizeMode, 'contain');
});

test('development expo splash plugin widens Android icon; JS overlay supplies fullscreen hero', () => {
  const dev = expoSplashPluginConfigFor('development');
  assert.equal(dev.resizeMode, 'cover');
  assert.equal(dev.enableFullScreenImage_legacy, true);
  assert.equal(dev.android?.resizeMode, 'cover');
  assert.equal(dev.android?.imageWidth, 288);
  const prod = expoSplashPluginConfigFor('production');
  assert.equal(prod.imageWidth, 200);
});

test('notification plugin icons follow the same variant split', () => {
  assert.equal(notificationIconFor('development').icon, DEVELOPMENT_APP_ICON);
  assert.equal(
    notificationIconFor('production').icon,
    PRODUCTION_ADAPTIVE_FOREGROUND,
  );
  assert.equal(notificationIconFor('production').icon, notificationIconFor('development').icon);
});
