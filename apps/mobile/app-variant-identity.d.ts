declare module './app-variant-identity.cjs' {
  export type AppVariant = 'development' | 'production';

  export type VariantIdentity = {
    name: string;
    slug: string;
    scheme: string;
    androidPackage: string;
    iosBundleIdentifier: string;
  };

  export const DEVELOPMENT_APP_ICON: string;
  export const DEVELOPMENT_ADAPTIVE_FOREGROUND: string;
  export const DEVELOPMENT_ADAPTIVE_BACKGROUND_IMAGE: string;
  export const DEVELOPMENT_ADAPTIVE_MONOCHROME: string;
  export const DEVELOPMENT_ADAPTIVE_BACKGROUND_COLOR: string;
  export const PRODUCTION_APP_ICON: string;
  export const PRODUCTION_ADAPTIVE_FOREGROUND: string;
  export const PRODUCTION_ADAPTIVE_BACKGROUND_COLOR: string;

  export function resolveAppVariant(appVariant?: string): AppVariant;
  export function iconFor(variant: AppVariant): string;
  export function androidAdaptiveIconFor(variant: AppVariant): {
    backgroundColor: string;
    foregroundImage: string;
    backgroundImage?: string;
    monochromeImage?: string;
  };
  export function identityFor(variant: AppVariant): VariantIdentity;
  export function notificationIconFor(variant: AppVariant): {
    icon: string;
    color: string;
  };
}

export {};
