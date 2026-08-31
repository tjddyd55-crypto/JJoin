import fs from 'node:fs';
import path from 'node:path';
import { ExpoConfig, ConfigContext } from 'expo/config';
import {
  androidAdaptiveIconFor,
  iconFor,
  identityFor,
  notificationIconFor,
  resolveAppVariant,
} from './app-variant-identity.cjs';

type AppVariant = 'development' | 'production';

/**
 * Expo config — Kakao Map requires Development Build (not Expo Go).
 * Kakao Map Native App Key ≠ Kakao Login Native App Key ≠ REST API Key.
 *
 * Variant SSOT: APP_VARIANT=development | production
 * (set by eas.json profile env, or local shell/.env for Metro/prebuild)
 *
 * Icon / package identity: `./app-variant-identity.cjs` (do not cross-fallback).
 *
 * EAS projectId is a public UUID (not a secret). Prefer env override for CI;
 * default matches @tjddyd55/jjoin created via `eas init`.
 *
 * Local `android/` / `ios/` are gitignored AND easignored so Preview builds
 * always regenerate launcher icons from APP_VARIANT (never reuse a polluted
 * local prebuild from the other variant).
 */
const DEFAULT_EAS_PROJECT_ID = '7882917d-f3be-4832-bb62-754702a7d205';

/**
 * Variant-isolated Firebase Android clients — never cross-fallback.
 * Place files locally (gitignored); missing file → push tray may be unavailable.
 */
const GOOGLE_SERVICES_BY_VARIANT: Record<AppVariant, string> = {
  development: './firebase/google-services.development.json',
  production: './firebase/google-services.production.json',
};

/** Production Railway API — SSOT for production/preview builds. */
const PRODUCTION_API_URL = 'https://api-production-2d67e.up.railway.app';

/** Development Railway API — SSOT for APP_VARIANT=development builds. */
const DEVELOPMENT_API_URL = 'https://api-development-e387.up.railway.app';

/** Landing base URLs for public join share links (`/j/{shareSlug}`). */
const DEVELOPMENT_LANDING_URL = 'https://landing-development-da68.up.railway.app';
const PRODUCTION_LANDING_URL = 'https://landing-production-0d39.up.railway.app';

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

function resolveLandingUrl(variant: AppVariant): string {
  const explicit = process.env.EXPO_PUBLIC_LANDING_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return variant === 'development' ? DEVELOPMENT_LANDING_URL : PRODUCTION_LANDING_URL;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveAppVariant(process.env.APP_VARIANT);
  const identity = identityFor(variant);
  const apiUrl = resolveApiUrl(variant);
  const landingUrl = resolveLandingUrl(variant);

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
  const googleServicesFromEnv = process.env.GOOGLE_SERVICES_JSON?.trim();
  const googleServicesFile =
    googleServicesFromEnv || GOOGLE_SERVICES_BY_VARIANT[variant];
  const googleServicesPath = path.isAbsolute(googleServicesFile)
    ? googleServicesFile
    : path.resolve(__dirname, googleServicesFile);
  const hasGoogleServices = fs.existsSync(googleServicesPath);

  const notificationIcon = notificationIconFor(variant);

  const plugins: ExpoConfig['plugins'] = [
    'expo-router',
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
        icon: notificationIcon.icon,
        color: notificationIcon.color,
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

  // Dev Launcher only for Development identity (eas developmentClient).
  // Production/preview standalone must not register expo-dev-client.
  if (variant === 'development') {
    plugins.splice(1, 0, 'expo-dev-client');
  }

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
    version: '0.0.5',
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
      versionCode: 5,
      ...(hasGoogleServices ? { googleServicesFile } : {}),
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
      landingUrl,
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
