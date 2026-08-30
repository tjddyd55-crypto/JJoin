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

/** Development Railway API — SSOT for APP_VARIANT=development builds. */
const DEVELOPMENT_API_URL = 'https://api-development-e387.up.railway.app';

/** Development keeps legacy Expo default icons (side-by-side distinction). */
const DEVELOPMENT_APP_ICON = './assets/images/icon.png';
const DEVELOPMENT_ADAPTIVE_FOREGROUND =
  './assets/images/android-icon-foreground.png';
const DEVELOPMENT_ADAPTIVE_BACKGROUND_IMAGE =
  './assets/images/android-icon-background.png';
const DEVELOPMENT_ADAPTIVE_MONOCHROME =
  './assets/images/android-icon-monochrome.png';
/** Legacy Expo adaptive fill (teal) — DEV only. */
const DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR = '#0A6B56';

/**
 * Production launcher assets (user-supplied under assets/icons/).
 * - Full icon: opaque finished art for Expo `icon` / iOS.
 * - Foreground: transparent adaptive layer for Android.
 * Background fill reuses Club Minimal darkest canvas token (palette.neutral950).
 */
const PRODUCTION_APP_ICON = './assets/icons/jjoinzone-prod-icon.png';
const PRODUCTION_ADAPTIVE_FOREGROUND =
  './assets/icons/jjoinzone-prod-foreground.png';
const PRODUCTION_ADAPTIVE_BACKGROUND_COLOR = '#09090A';

export type AppVariant = 'development' | 'production';

function resolveAppVariant(): AppVariant {
  return process.env.APP_VARIANT === 'development' ? 'development' : 'production';
}

function iconFor(variant: AppVariant): string {
  return variant === 'development' ? DEVELOPMENT_APP_ICON : PRODUCTION_APP_ICON;
}

function androidAdaptiveIconFor(
  variant: AppVariant,
): NonNullable<ExpoConfig['android']>['adaptiveIcon'] {
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
      // Same EAS project slug as production (projectId ↔ slug must match).
      // Side-by-side identity is package + custom scheme, not Expo slug.
      slug: 'jjoin',
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
 * - development default → Development API (never localhost).
 */
function resolveApiUrl(variant: AppVariant): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit;

  if (variant === 'development') {
    return (
      process.env.EXPO_PUBLIC_DEVELOPMENT_API_URL?.trim() || DEVELOPMENT_API_URL
    );
  }

  return PRODUCTION_API_URL;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveAppVariant();
  const identity = identityFor(variant);
  const apiUrl = resolveApiUrl(variant);

  /**
   * Kakao Native App Keys — fully split by APP_VARIANT.
   * Development uses *_DEV only (no fallback to Production keys).
   * Production uses non-_DEV only. Never cross-wire.
   */
  const kakaoMapNativeAppKey =
    variant === 'development'
      ? process.env.EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY_DEV?.trim() || ''
      : process.env.EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY?.trim() || '';
  const kakaoLoginNativeAppKey =
    variant === 'development'
      ? process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY_DEV?.trim() || ''
      : process.env.EXPO_PUBLIC_KAKAO_LOGIN_NATIVE_APP_KEY?.trim() || '';
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

  const appIcon = iconFor(variant);
  const adaptiveIcon = androidAdaptiveIconFor(variant);

  return {
    ...config,
    name: identity.name,
    slug: identity.slug,
    owner: 'tjddyd55',
    version: '0.0.2',
    orientation: 'portrait',
    icon: appIcon,
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
      adaptiveIcon,
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
