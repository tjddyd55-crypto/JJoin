import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo config — Kakao Map requires Development Build (not Expo Go).
 * Kakao Map Native App Key ≠ Kakao Login Native App Key ≠ REST API Key.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const kakaoMapNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY ?? '';
  const kakaoLoginNativeAppKey = process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY ?? '';
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  const naverUrlScheme = process.env.EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME ?? 'jjoinnaverlogin';

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
        nativeAppKey: kakaoMapNativeAppKey || 'MISSING_KAKAO_MAP_NATIVE_APP_KEY',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: [
            'https://devrepo.kakao.com/nexus/repository/kakaomap-releases/',
            'https://devrepo.kakao.com/nexus/content/groups/public/',
          ],
        },
      },
    ],
  ];

  if (kakaoLoginNativeAppKey) {
    plugins.push([
      '@react-native-seoul/kakao-login',
      {
        kakaoAppKey: kakaoLoginNativeAppKey,
        overrideKakaoSDKVersion: '2.11.2',
      },
    ]);
  }

  if (googleWebClientId) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: googleWebClientId.split('.').reverse().join('.'),
      },
    ]);
  }

  if (process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID) {
    plugins.push([
      '@react-native-seoul/naver-login',
      {
        urlScheme: naverUrlScheme,
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
      mapProvider: 'kakao' as const,
      kakaoMapNativeAppKeyConfigured: Boolean(kakaoMapNativeAppKey),
      kakaoLoginNativeAppKeyConfigured: Boolean(kakaoLoginNativeAppKey),
      googleLoginConfigured: Boolean(googleWebClientId),
      naverLoginConfigured: Boolean(process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID),
      eas: {
        projectId: undefined,
      },
    },
  };
};
