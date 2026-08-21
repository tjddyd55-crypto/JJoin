import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

export type KakaoMapMarkerDto = {
  id: string;
  kind: 'venue' | 'user' | 'me';
  latitude: number;
  longitude: number;
  caption: string;
  selected?: boolean;
};

export type KakaoCameraChangedEvent = {
  latitude: number;
  longitude: number;
  zoomLevel: number;
  reason: 'Gesture' | 'Program' | 'Unknown' | string;
  west: number;
  south: number;
  east: number;
  north: number;
};

export type KakaoViewportBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
  centerLat: number;
  centerLng: number;
  zoomLevel: number;
};

export type JjoinKakaoMapViewRef = {
  animateCameraTo: (latitude: number, longitude: number, durationMs: number) => Promise<void>;
  getViewportBounds: () => Promise<KakaoViewportBounds>;
};

type NativeProps = {
  style?: StyleProp<ViewStyle>;
  initialLatitude: number;
  initialLongitude: number;
  initialZoomLevel: number;
  markersJson: string;
  onMapReady?: (event: { nativeEvent: { ok: boolean } }) => void;
  onMapError?: (event: { nativeEvent: { message: string; hint?: string } }) => void;
  onCameraChanged?: (event: { nativeEvent: KakaoCameraChangedEvent }) => void;
  onMarkerPress?: (event: { nativeEvent: { id: string } }) => void;
};

const NativeView =
  Platform.OS === 'android'
    ? (requireNativeViewManager('JjoinKakaoMap') as React.ComponentType<NativeProps>)
    : null;

export const JjoinKakaoMapView = React.forwardRef<
  JjoinKakaoMapViewRef,
  Omit<NativeProps, 'markersJson'> & { markers: KakaoMapMarkerDto[] }
>(function JjoinKakaoMapViewInner(
  { markers, onMapReady, onMapError, onCameraChanged, onMarkerPress, ...rest },
  ref,
) {
  const nativeRef = React.useRef<JjoinKakaoMapViewRef | null>(null);

  React.useImperativeHandle(ref, () => ({
    animateCameraTo: async (latitude, longitude, durationMs) => {
      await nativeRef.current?.animateCameraTo(latitude, longitude, durationMs);
    },
    getViewportBounds: async () => {
      const bounds = await nativeRef.current?.getViewportBounds();
      if (!bounds) {
        throw new Error('kakao_map_bounds_unavailable');
      }
      return bounds;
    },
  }));

  if (!NativeView) {
    return <View style={rest.style} />;
  }

  const markersJson = React.useMemo(() => JSON.stringify(markers), [markers]);

  return (
    <NativeView
      // @ts-expect-error Expo native view ref typing is opaque across bridges
      ref={nativeRef}
      {...rest}
      markersJson={markersJson}
      onMapReady={onMapReady}
      onMapError={onMapError}
      onCameraChanged={onCameraChanged}
      onMarkerPress={onMarkerPress}
    />
  );
});
