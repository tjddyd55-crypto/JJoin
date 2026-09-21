declare module './eas-update-policy.cjs' {
  export type AppVariant = 'development' | 'production';
  export type EasUpdateChannel = 'development' | 'production';

  export const EAS_UPDATE_CHANNELS: {
    readonly development: 'development';
    readonly production: 'production';
  };

  export const STANDALONE_DEV_BUILD_PROFILE: 'development-standalone';

  export const EAS_BUILD_PROFILE_CHANNELS: {
    readonly development: 'development';
    readonly 'development-standalone': 'development';
    readonly preview: 'production';
    readonly production: 'production';
  };

  export const RUNTIME_VERSION_POLICY: { readonly policy: 'appVersion' };
  export const UPDATES_CHECK_AUTOMATICALLY: 'ON_LOAD';
  export const UPDATES_FALLBACK_TO_CACHE_TIMEOUT_MS: 0;

  export function shouldIncludeExpoDevClient(input: {
    variant: AppVariant;
    easBuildProfile?: string;
    useDevClient?: string;
  }): boolean;
  export function updateChannelFor(variant: AppVariant): EasUpdateChannel;
  export function updatesUrlFor(projectId: string): string;
  export function updatesConfigFor(
    variant: AppVariant,
    projectId: string,
  ): {
    url: string;
    checkAutomatically: 'ON_LOAD';
    fallbackToCacheTimeout: number;
    requestHeaders: { 'expo-channel-name': EasUpdateChannel };
  };
}

export {};
