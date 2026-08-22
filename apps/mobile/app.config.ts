import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo config — Kakao Map requires Development Build (not Expo Go).
 * Native App Key (map) ≠ REST API Key (Kakao Local on Railway).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY ?? '';

  const plugins: ExpoConfig['plugins'] = [
    'expo-router',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          '주변 스크린골프장과 조인을 찾기 위해 현재 위치를 사용합니다.',
      },
    ],
    [
      './modules/jjoin-kakao-map/app.plugin.js',
      {
        nativeAppKey: kakaoNativeAppKey || 'MISSING_KAKAO_MAP_NATIVE_APP_KEY',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: [
            'https://devrepo.kakao.com/nexus/repository/kakaomap-releases/',
          ],
        },
      },
    ],
  ];

  return {
    ...config,
    name: 'JJOIN',
    slug: 'jjoin',
    version: '0.0.1',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'jjoin',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.jjoin.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          '주변 스크린골프장과 조인을 찾기 위해 현재 위치를 사용합니다.',
      },
    },
    android: {
      package: 'com.jjoin.app',
      adaptiveIcon: {
        backgroundColor: '#0A6B56',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins,
    experiments: {
      typedRoutes: true,
    },
    extra: {
      mapProvider: 'kakao' as const,
      kakaoMapNativeAppKeyConfigured: Boolean(kakaoNativeAppKey),
      eas: {
        projectId: undefined,
      },
    },
  };
};
