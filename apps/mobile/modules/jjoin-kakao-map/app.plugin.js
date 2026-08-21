const {
  withAppBuildGradle,
  withMainApplication,
  withStringsXml,
  createRunOncePlugin,
} = require('@expo/config-plugins');

/**
 * Injects Kakao Map Native App Key into Android strings + MainApplication init.
 * REST API keys must never be passed here.
 */
function withKakaoMapNative(config, props = {}) {
  const nativeAppKey = props.nativeAppKey || '';

  config = withStringsXml(config, (cfg) => {
    const resources = cfg.modResults.resources;
    if (!resources.string) resources.string = [];
    const filtered = resources.string.filter(
      (item) => item?.$?.name !== 'kakao_map_native_app_key',
    );
    filtered.push({
      $: { name: 'kakao_map_native_app_key', translatable: 'false' },
      _: nativeAppKey || 'MISSING_KAKAO_MAP_NATIVE_APP_KEY',
    });
    resources.string = filtered;
    return cfg;
  });

  config = withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes('KakaoMapSdk.init')) {
      return cfg;
    }

    const isKotlin = cfg.modResults.language === 'kt' || contents.includes('class MainApplication');

    if (isKotlin) {
      if (!contents.includes('import com.kakao.vectormap.KakaoMapSdk')) {
        contents = contents.replace(
          /(package [\w.]+\s*\n)/,
          `$1\nimport com.kakao.vectormap.KakaoMapSdk\n`,
        );
      }
      contents = contents.replace(
        /super\.onCreate\(\)/,
        `super.onCreate()\n    KakaoMapSdk.init(this, getString(R.string.kakao_map_native_app_key))`,
      );
    } else {
      if (!contents.includes('import com.kakao.vectormap.KakaoMapSdk')) {
        contents = contents.replace(
          /(package [\w.]+;\s*)/,
          `$1\nimport com.kakao.vectormap.KakaoMapSdk;\n`,
        );
      }
      contents = contents.replace(
        'super.onCreate()',
        `super.onCreate();\n    KakaoMapSdk.init(this, getString(R.string.kakao_map_native_app_key));`,
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('com.kakao.maps.open:android')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    implementation("com.kakao.maps.open:android:2.15.1")`,
      );
    }
    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(withKakaoMapNative, 'jjoin-kakao-map', '1.0.0');
