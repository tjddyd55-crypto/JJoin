import Constants from 'expo-constants';
import { isDevelopmentVariant } from './app-variant';

const DEVELOPMENT_LANDING_URL = 'https://landing-development-da68.up.railway.app';
const PRODUCTION_LANDING_URL = 'https://landing-production-0d39.up.railway.app';

/**
 * Public Landing base URL for share links.
 * Prefer EXPO_PUBLIC_LANDING_URL → app.config extra.landingUrl → variant default.
 */
export function resolveLandingBaseUrl(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_LANDING_URL ?? '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromExtra = (
    Constants.expoConfig?.extra as { landingUrl?: string } | undefined
  )?.landingUrl?.trim();
  if (fromExtra) return fromExtra.replace(/\/$/, '');

  return isDevelopmentVariant() ? DEVELOPMENT_LANDING_URL : PRODUCTION_LANDING_URL;
}

export function publicJoinShareUrl(shareSlug: string): string {
  return `${resolveLandingBaseUrl()}/j/${encodeURIComponent(shareSlug)}`;
}
