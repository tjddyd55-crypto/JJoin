import Constants from 'expo-constants';

export type MapProviderId = 'kakao';

export type MapRuntimeStatus =
  | { kind: 'ready'; provider: 'kakao' }
  | { kind: 'missing_native_key'; provider: 'kakao' }
  | { kind: 'expo_go_unsupported'; provider: 'kakao' }
  | { kind: 'unavailable'; provider: 'kakao'; message: string };

type MapExtra = {
  mapProvider?: MapProviderId;
  kakaoMapNativeAppKeyConfigured?: boolean;
};

function readExtra(): MapExtra {
  return (Constants.expoConfig?.extra as MapExtra | undefined) ?? {};
}

export function getMapProvider(): MapProviderId {
  return 'kakao';
}

export function getMapRuntimeStatus(): MapRuntimeStatus {
  const extra = readExtra();

  if (Constants.appOwnership === 'expo') {
    return { kind: 'expo_go_unsupported', provider: 'kakao' };
  }

  if (!extra.kakaoMapNativeAppKeyConfigured) {
    return { kind: 'missing_native_key', provider: 'kakao' };
  }

  return { kind: 'ready', provider: 'kakao' };
}
