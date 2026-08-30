/**
 * Runtime APP_VARIANT SSOT (mirrors app.config.ts resolveAppVariant).
 * Never infer from __DEV__ — Production identity can attach Metro with __DEV__=true.
 */
export function isDevelopmentVariant(
  appVariant: string | undefined = process.env.APP_VARIANT,
): boolean {
  return appVariant === 'development';
}
