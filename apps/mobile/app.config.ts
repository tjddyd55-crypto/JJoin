import fs from 'node:fs';
import path from 'node:path';
import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Expo config — Kakao Map requires Development Build (not Expo Go).
 * Kakao Map Native App Key ≠ Kakao Login Native App Key ≠ REST API Key.
 *
 * Variant SSOT: APP_VARIANT=development | production
 * (set by eas.json profile env, or local shell/.env for Metro/prebuild)
 *
 * EAS projectId is a public UUID (not a secret). Prefer env override for CI;
 * default matches @tjddyd55/jjoin created via `eas init`.
 */
const DEFAULT_EAS_PROJECT_ID = '7882917d-f3be-4832-bb62-754702a7d205';
const GOOGLE_SERVICES_FILE = './google-services.json';

/** Production Railway API — SSOT for production/preview builds. */
const PRODUCTION_API_URL = 'https://api-production-2d67e.up.railway.app';

export type AppVariant = 'development' | 'production';

function resolveAppVariant(): AppVariant {
  return process.env.APP_VARIANT === 'development' ? 'development' : 'production';
}

type VariantIdentity = {
  name: string;
  /** Expo slug — drives Dev Client `exp+{slug}` scheme; keep distinct per variant. */
  slug: string;
  scheme: string;
  androidPackage: string;
  iosBundleIdentifier: string;
};

function identityFor(variant: AppVariant): VariantIdentity {
  if (variant === 'development') {
    return {
      name: 'JJOINZONE DEV',
      slug: 'jjoin-dev',
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
 * API URL resolution:
 * - Explicit EXPO_PUBLIC_API_URL always wins (local override / EAS env).
 * - production/preview default → Production API.
 * - development has no localhost default; set EXPO_PUBLIC_API_URL (or
 *   EXPO_PUBLIC_DEVELOPMENT_API_URL) to the shared Development API.
 */
function resolveApiUrl(variant: AppVariant): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit;

  if (variant === 'development') {
    const developmentApi = process.env.EXPO_PUBLIC_DEVELOPMENT_API_URL?.trim();
    return developmentApi || '';
  }

  return PRODUCTION_API_URL;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveAppVariant();
  const identity = identityFor(variant);
  const apiUrl = resolveApiUrl(variant);

  /**
   * Kakao keys: shared by default (same Kakao app + package registration).
   * Optional *_DEV overrides only when Development uses a separate Native App Key.
   * Production always uses the non-_DEV variables — never overwritten by DEV slots.
   */
  const kakaoMapNativeAppKey =
    (variant === 'development'
      ? process.env.EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY_DEV?.trim()
      : '') ||
    process.env.EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY?.trim() ||
    '';
  const kakaoLoginNativeAppKey =
    (variant === 'development'
      ? process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY_DEV?.trim()
      : '') ||
    process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY?.trim() ||
    '';
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
  const naverUrlScheme = process.env.EXPO_PUBLIC_NAVER_LOGIN_URL_SCHEME ?? 'jjoinnaverlogin';
  const easProjectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() || DEFAULT_EAS_PROJECT_ID;
  const googleServicesPath = path.resolve(__dirname, GOOGLE_SERVICES_FILE);
  const hasGoogleServices = fs.existsSync(googleServicesPath);

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
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#0A6B56',
        defaultChannel: 'jjoin-general',
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
    name: identity.name,
    slug: identity.slug,
    owner: 'tjddyd55',
    version: '0.0.2',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: identity.scheme,
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: identity.iosBundleIdentifier,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          '주변 스크린골프장과 조인을 찾기 위해 현재 위치를 사용합니다.',
      },
    },
    android: {
      package: identity.androidPackage,
      versionCode: 2,
      ...(hasGoogleServices ? { googleServicesFile: GOOGLE_SERVICES_FILE } : {}),
      adaptiveIcon: {
        backgroundColor: '#0A6B56',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'POST_NOTIFICATIONS',
      ],
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
      appVariant: variant,
      apiUrl,
      mapProvider: 'kakao' as const,
      kakaoMapNativeAppKeyConfigured: Boolean(kakaoMapNativeAppKey),
      kakaoLoginNativeAppKeyConfigured: Boolean(kakaoLoginNativeAppKey),
      googleLoginConfigured: Boolean(googleWebClientId),
      naverLoginConfigured: Boolean(process.env.EXPO_PUBLIC_NAVER_LOGIN_CLIENT_ID),
      googleServicesConfigured: hasGoogleServices,
      eas: {
        projectId: easProjectId,
      },
    },
  };
};
