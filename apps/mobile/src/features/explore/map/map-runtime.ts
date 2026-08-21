import Constants from 'expo-constants';

export type MapRuntimeStatus =
  | { kind: 'ready' }
  | { kind: 'missing_client_id' }
  | { kind: 'expo_go_unsupported' }
  | { kind: 'unavailable'; message: string };

export function getNaverMapRuntimeStatus(): MapRuntimeStatus {
  const configured = Boolean(
    (Constants.expoConfig?.extra as { naverMapClientIdConfigured?: boolean } | undefined)
      ?.naverMapClientIdConfigured,
  );
  if (!configured) return { kind: 'missing_client_id' };

  // Expo Go cannot load native Naver Map modules.
  if (Constants.appOwnership === 'expo') {
    return { kind: 'expo_go_unsupported' };
  }

  return { kind: 'ready' };
}
