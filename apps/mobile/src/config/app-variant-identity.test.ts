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
} from '../../app-variant-identity.cjs';

test('resolveAppVariant: only explicit development selects DEV', () => {
  assert.equal(resolveAppVariant('development'), 'development');
  assert.equal(resolveAppVariant('production'), 'production');
  assert.equal(resolveAppVariant(''), 'production');
  assert.equal(resolveAppVariant('staging'), 'production');
});

test('production identity uses gold icons and com.jjoin.app', () => {
  const id = identityFor('production');
  assert.equal(id.name, 'JJOINZONE');
  assert.equal(id.androidPackage, 'com.jjoin.app');
  assert.equal(iconFor('production'), PRODUCTION_APP_ICON);
  const adaptive = androidAdaptiveIconFor('production');
  assert.equal(adaptive.foregroundImage, PRODUCTION_ADAPTIVE_FOREGROUND);
  assert.equal(adaptive.backgroundColor, PRODUCTION_ADAPTIVE_BACKGROUND_COLOR);
  assert.equal(adaptive.backgroundImage, undefined);
  assert.equal(adaptive.monochromeImage, undefined);
  assert.notEqual(iconFor('production'), DEVELOPMENT_APP_ICON);
  assert.notEqual(adaptive.foregroundImage, DEVELOPMENT_ADAPTIVE_FOREGROUND);
});

test('development identity uses Expo DEV icons and com.jjoin.app.dev', () => {
  const id = identityFor('development');
  assert.equal(id.name, 'JJOINZONE DEV');
  assert.equal(id.androidPackage, 'com.jjoin.app.dev');
  assert.equal(iconFor('development'), DEVELOPMENT_APP_ICON);
  const adaptive = androidAdaptiveIconFor('development');
  assert.equal(adaptive.foregroundImage, DEVELOPMENT_ADAPTIVE_FOREGROUND);
  assert.equal(adaptive.backgroundColor, DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR);
  assert.notEqual(iconFor('development'), PRODUCTION_APP_ICON);
  assert.notEqual(adaptive.foregroundImage, PRODUCTION_ADAPTIVE_FOREGROUND);
});

test('notification plugin icons follow the same variant split', () => {
  assert.equal(notificationIconFor('development').icon, DEVELOPMENT_APP_ICON);
  assert.equal(
    notificationIconFor('production').icon,
    PRODUCTION_ADAPTIVE_FOREGROUND,
  );
  assert.notEqual(
    notificationIconFor('production').icon,
    notificationIconFor('development').icon,
  );
});
