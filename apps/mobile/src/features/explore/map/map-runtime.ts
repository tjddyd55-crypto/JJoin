import Constants from 'expo-constants';

export type MapProviderId = 'kakao' | 'naver';

export type MapRuntimeStatus =
  | { kind: 'ready'; provider: MapProviderId }
  | { kind: 'missing_native_key'; provider: 'kakao' }
  | { kind: 'missing_client_id'; provider: 'naver' }
  | { kind: 'expo_go_unsupported'; provider: MapProviderId }
  | { kind: 'unavailable'; provider: MapProviderId; message: string };

type MapExtra = {
  mapProvider?: MapProviderId;
  kakaoMapNativeAppKeyConfigured?: boolean;
  naverMapClientIdConfigured?: boolean;
};

function readExtra(): MapExtra {
  return (Constants.expoConfig?.extra as MapExtra | undefined) ?? {};
}

/** Production default is Kakao. Temporary `naver` kept only for migration rollback. */
export function getMapProvider(): MapProviderId {
  const fromExtra = readExtra().mapProvider;
  if (fromExtra === 'kakao' || fromExtra === 'naver') return fromExtra;
  return 'kakao';
}

export function getMapRuntimeStatus(): MapRuntimeStatus {
  const provider = getMapProvider();
  const extra = readExtra();

  if (Constants.appOwnership === 'expo') {
    return { kind: 'expo_go_unsupported', provider };
  }

  if (provider === 'kakao') {
    if (!extra.kakaoMapNativeAppKeyConfigured) {
      return { kind: 'missing_native_key', provider: 'kakao' };
    }
    return { kind: 'ready', provider: 'kakao' };
  }

  if (!extra.naverMapClientIdConfigured) {
    return { kind: 'missing_client_id', provider: 'naver' };
  }
  return { kind: 'ready', provider: 'naver' };
}

/** @deprecated Use getMapRuntimeStatus — kept during Phase I migration. */
export function getNaverMapRuntimeStatus(): MapRuntimeStatus {
  return getMapRuntimeStatus();
}
