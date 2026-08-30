import Constants from 'expo-constants';

/**
 * Runtime APP_VARIANT SSOT (mirrors app.config.ts resolveAppVariant).
 * Never infer from __DEV__ — Production identity can attach Metro with __DEV__=true.
 *
 * Prefer Metro/EAS `process.env.APP_VARIANT`, then baked `extra.appVariant`
 * from the Dev Client / production binary (reliable when Metro does not inline APP_VARIANT).
 */
export function resolveAppVariant(
  appVariant: string | undefined = process.env.APP_VARIANT,
): 'development' | 'production' {
  if (appVariant === 'development' || appVariant === 'production') {
    return appVariant;
  }
  const fromExtra = (Constants.expoConfig?.extra as { appVariant?: string } | undefined)
    ?.appVariant;
  return fromExtra === 'development' ? 'development' : 'production';
}

export function isDevelopmentVariant(
  appVariant: string | undefined = process.env.APP_VARIANT,
): boolean {
  return resolveAppVariant(appVariant) === 'development';
}
