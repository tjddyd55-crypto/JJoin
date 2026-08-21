import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo config — Naver Map requires Development Build (not Expo Go).
 * Client ID from env only; never hardcode secrets.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const naverClientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? '';

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
    plugins: [
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
        '@mj-studio/react-native-naver-map',
        {
          // Empty string keeps config valid; map shows Missing Config until set.
          client_id: naverClientId || 'MISSING_NAVER_MAP_CLIENT_ID',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: ['https://repository.map.naver.com/archive/maven'],
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      naverMapClientIdConfigured: Boolean(naverClientId),
      eas: {
        projectId: undefined,
      },
    },
  };
};
