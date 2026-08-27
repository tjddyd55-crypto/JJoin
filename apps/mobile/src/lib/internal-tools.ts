/**
 * Gates mock/QA chrome for public test & production APKs.
 * Dev Client (__DEV__) keeps tools; set EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED=true
 * only for intentional internal builds.
 */
export function isInternalToolsEnabled(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return process.env.EXPO_PUBLIC_INTERNAL_TOOLS_ENABLED === 'true';
}
