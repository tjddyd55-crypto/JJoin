const fs = require('node:fs');
const path = require('node:path');
const { withAndroidStyles } = require('@expo/config-plugins');

const EMPTY_ICON = 'dev_splash_empty_icon';
const SPLASH_THEME_NAME = 'Theme.App.SplashScreen';

const EMPTY_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="@color/splashscreen_background"
        android:pathData="M0,0h108v108h-108z" />
</vector>
`;

function patchSplashThemeItems(styles) {
  const theme = styles.resources?.style?.find((entry) => entry.$?.name === SPLASH_THEME_NAME);
  if (!theme?.item) {
    return styles;
  }
  for (const item of theme.item) {
    const name = item.$?.name;
    if (name === 'windowSplashScreenAnimatedIcon') {
      item._ = `@drawable/${EMPTY_ICON}`;
    }
    if (name === 'android:windowSplashScreenBehavior') {
      item._ = 'default';
    }
  }
  return styles;
}

function withDevMinimalAndroidSplash(config) {
  return withAndroidStyles(config, (cfg) => {
    const drawableDir = path.join(
      cfg.modRequest.platformProjectRoot,
      'app/src/main/res/drawable',
    );
    fs.mkdirSync(drawableDir, { recursive: true });
    fs.writeFileSync(path.join(drawableDir, `${EMPTY_ICON}.xml`), EMPTY_ICON_XML, 'utf8');

    cfg.modResults = patchSplashThemeItems(cfg.modResults);
    return cfg;
  });
}

module.exports = withDevMinimalAndroidSplash;
