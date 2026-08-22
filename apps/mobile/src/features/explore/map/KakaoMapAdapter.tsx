import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  JjoinKakaoMapView,
  type JjoinKakaoMapViewRef,
  type KakaoMapMarkerDto,
} from 'jjoin-kakao-map';
import type { ExploreVenueDto, PublicNearbyUserDto } from '@jjoin/types';
import type { MapBounds, MapCoordinate, MapRegion } from '../model/map-types';
import { latitudeDeltaToZoomLevel } from './map-geo';
import type { MapCameraHandle } from './map-handle';

export type { MapCameraHandle } from './map-handle';

export type KakaoMapAdapterProps = {
  initialRegion: MapRegion;
  cameraKey: number;
  cameraTarget: MapCoordinate | null;
  myLocation: MapCoordinate | null;
  venues: ExploreVenueDto[];
  users: PublicNearbyUserDto[];
  selectedVenueId: string | null;
  selectedUserId: string | null;
  onCameraGesture?: (center: MapCoordinate, bounds?: MapBounds) => void;
  onVenuePress: (venueId: string) => void;
  onUserPress: (userId: string) => void;
  mapRef?: React.RefObject<MapCameraHandle | null>;
};

/**
 * Sole place that talks to Kakao Map Android SDK (via jjoin-kakao-map).
 * Screens must not import the native module directly.
 */
export function KakaoMapAdapter({
  initialRegion,
  cameraKey,
  cameraTarget,
  myLocation,
  venues,
  users,
  selectedVenueId,
  selectedUserId,
  onCameraGesture,
  onVenuePress,
  onUserPress,
  mapRef,
}: KakaoMapAdapterProps) {
  const nativeRef = React.useRef<JjoinKakaoMapViewRef | null>(null);

  React.useImperativeHandle(mapRef, () => ({
    animateCameraTo: async (target, durationMs = 500) => {
      await nativeRef.current?.animateCameraTo(
        target.latitude,
        target.longitude,
        durationMs,
      );
    },
    getViewportBounds: async () => {
      const b = await nativeRef.current!.getViewportBounds();
      return {
        southWest: { latitude: b.south, longitude: b.west },
        northEast: { latitude: b.north, longitude: b.east },
        center: { latitude: b.centerLat, longitude: b.centerLng },
      };
    },
  }));

  const markers: KakaoMapMarkerDto[] = useMemo(() => {
    const list: KakaoMapMarkerDto[] = [];
    for (const v of venues) {
      const selected = v.venueId === selectedVenueId;
      list.push({
        id: `venue:${v.venueId}`,
        kind: 'venue',
        latitude: v.latitude,
        longitude: v.longitude,
        caption: v.openJoinCount > 0 ? `⛳ ${v.openJoinCount}` : '⛳',
        selected,
      });
    }
    for (const u of users) {
      const selected = u.userId === selectedUserId;
      list.push({
        id: `user:${u.userId}`,
        kind: 'user',
        latitude: u.displayLat,
        longitude: u.displayLng,
        caption: selected ? u.nickname : '👤',
        selected,
      });
    }
    if (myLocation) {
      list.push({
        id: 'me',
        kind: 'me',
        latitude: myLocation.latitude,
        longitude: myLocation.longitude,
        caption: '나',
        selected: false,
      });
    }
    return list;
  }, [venues, users, myLocation, selectedVenueId, selectedUserId]);

  const zoomLevel = latitudeDeltaToZoomLevel(initialRegion.latitudeDelta);

  return (
    <>
      <JjoinKakaoMapView
        ref={nativeRef}
        style={[StyleSheet.absoluteFill, styles.map]}
        initialLatitude={initialRegion.latitude}
        initialLongitude={initialRegion.longitude}
        initialZoomLevel={zoomLevel}
        markers={markers}
        onMapReady={(e) => {
          const ev = e.nativeEvent as {
            ok?: boolean;
            width?: number;
            height?: number;
            surfaceWidth?: number;
            surfaceHeight?: number;
            vulkan?: boolean;
          };
          console.log('[KakaoMap] ready', {
            ok: ev.ok,
            width: ev.width,
            height: ev.height,
            surfaceWidth: ev.surfaceWidth,
            surfaceHeight: ev.surfaceHeight,
            vulkan: ev.vulkan,
          });
        }}
        onMapError={(e) => {
          console.warn('[KakaoMap] error', e.nativeEvent);
        }}
        onCameraChanged={(e) => {
          const ev = e.nativeEvent;
          if (ev.reason !== 'Gesture') return;
          onCameraGesture?.(
            { latitude: ev.latitude, longitude: ev.longitude },
            {
              southWest: { latitude: ev.south, longitude: ev.west },
              northEast: { latitude: ev.north, longitude: ev.east },
            },
          );
        }}
        onMarkerPress={(e) => {
          const id = e.nativeEvent.id;
          if (id.startsWith('venue:')) {
            onVenuePress(id.slice('venue:'.length));
            return;
          }
          if (id.startsWith('user:')) {
            onUserPress(id.slice('user:'.length));
          }
        }}
      />
      {cameraTarget ? (
        <CameraMover
          mapRef={nativeRef}
          target={cameraTarget}
          token={cameraKey}
        />
      ) : null}
    </>
  );
}

function CameraMover({
  mapRef,
  target,
  token,
}: {
  mapRef: React.RefObject<JjoinKakaoMapViewRef | null>;
  target: MapCoordinate;
  token: number;
}) {
  React.useEffect(() => {
    void mapRef.current?.animateCameraTo(target.latitude, target.longitude, 500);
  }, [mapRef, target.latitude, target.longitude, token]);
  return null;
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: 'transparent',
  },
});
