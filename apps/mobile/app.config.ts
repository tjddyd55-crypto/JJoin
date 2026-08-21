import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo config — Kakao Map requires Development Build (not Expo Go).
 * Native App Key (map) ≠ REST API Key (Kakao Local on Railway).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const kakaoNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY ?? '';
  const naverClientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? '';
  const mapProviderEnv = (process.env.EXPO_PUBLIC_MAP_PROVIDER ?? 'kakao').toLowerCase();
  const mapProvider = mapProviderEnv === 'naver' ? 'naver' : 'kakao';

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
            // Temporary during Phase I migration rollback window
            'https://repository.map.naver.com/archive/maven',
          ],
        },
      },
    ],
  ];

  // Keep Naver plugin only while MAP_PROVIDER=naver rollback is needed.
  if (mapProvider === 'naver' || naverClientId) {
    plugins.push([
      '@mj-studio/react-native-naver-map',
      {
        client_id: naverClientId || 'MISSING_NAVER_MAP_CLIENT_ID',
      },
    ]);
  }

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
      mapProvider,
      kakaoMapNativeAppKeyConfigured: Boolean(kakaoNativeAppKey),
      naverMapClientIdConfigured: Boolean(naverClientId),
      eas: {
        projectId: undefined,
      },
    },
  };
};
