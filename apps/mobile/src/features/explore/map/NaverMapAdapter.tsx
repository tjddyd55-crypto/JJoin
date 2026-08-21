import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import type { ExploreVenueDto, PublicNearbyUserDto } from '@jjoin/types';
import type { MapCoordinate, MapRegion } from '../model/map-types';
import { AppText, colors } from '@jjoin/design-system';

export type NaverMapAdapterProps = {
  initialRegion: MapRegion;
  cameraKey: number;
  cameraTarget: MapCoordinate | null;
  myLocation: MapCoordinate | null;
  venues: ExploreVenueDto[];
  users: PublicNearbyUserDto[];
  selectedVenueId: string | null;
  selectedUserId: string | null;
  onCameraIdle?: (center: MapCoordinate) => void;
  onCameraGesture?: (center: MapCoordinate) => void;
  onVenuePress: (venueId: string) => void;
  onUserPress: (userId: string) => void;
  mapRef?: React.RefObject<NaverMapViewRef | null>;
};

/**
 * Sole place that talks to Naver Map SDK.
 * Screens must not import @mj-studio/react-native-naver-map directly.
 */
export function NaverMapAdapter({
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
}: NaverMapAdapterProps) {
  const initial = useMemo(
    () => ({
      latitude: initialRegion.latitude,
      longitude: initialRegion.longitude,
      latitudeDelta: initialRegion.latitudeDelta,
      longitudeDelta: initialRegion.longitudeDelta,
    }),
    [initialRegion],
  );

  return (
    <NaverMapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initial}
      isShowLocationButton={false}
      isShowZoomControls={false}
      isShowScaleBar={false}
      onCameraChanged={(e) => {
        if (!e) return;
        // Only gesture/control from user should dirty re-search CTA
        if (e.reason === 'Gesture' || e.reason === 'Control') {
          onCameraGesture?.({ latitude: e.latitude, longitude: e.longitude });
        }
      }}
    >
      {venues.map((v) => {
        const selected = v.venueId === selectedVenueId;
        const caption =
          v.openJoinCount > 0 ? `⛳ ${v.openJoinCount}` : '⛳';
        return (
          <NaverMapMarkerOverlay
            key={`venue-${v.venueId}`}
            latitude={v.latitude}
            longitude={v.longitude}
            image={{ symbol: selected ? 'green' : 'green' }}
            caption={{
              text: caption,
              color: selected ? '#023D31' : colors.primary,
              haloColor: '#FFFFFF',
            }}
            onTap={() => onVenuePress(v.venueId)}
            zIndex={selected ? 20 : 10}
            width={selected ? 42 : 34}
            height={selected ? 42 : 34}
          />
        );
      })}

      {users.map((u) => {
        const selected = u.userId === selectedUserId;
        return (
          <NaverMapMarkerOverlay
            key={`user-${u.userId}`}
            latitude={u.displayLat}
            longitude={u.displayLng}
            image={{ symbol: 'blue' }}
            caption={{
              text: selected ? `${u.nickname}` : '👤',
              color: '#2674B2',
              haloColor: '#FFFFFF',
            }}
            onTap={() => onUserPress(u.userId)}
            zIndex={selected ? 30 : 15}
            width={selected ? 38 : 30}
            height={selected ? 38 : 30}
          />
        );
      })}

      {myLocation ? (
        <NaverMapMarkerOverlay
          key="me"
          latitude={myLocation.latitude}
          longitude={myLocation.longitude}
          image={{ symbol: 'red' }}
          caption={{ text: '나', color: colors.danger, haloColor: '#FFFFFF' }}
          zIndex={5}
          width={26}
          height={26}
        />
      ) : null}

      {cameraTarget ? (
        <CameraMover mapRef={mapRef} target={cameraTarget} token={cameraKey} />
      ) : null}
    </NaverMapView>
  );
}

function CameraMover({
  mapRef,
  target,
  token,
}: {
  mapRef?: React.RefObject<NaverMapViewRef | null>;
  target: MapCoordinate;
  token: number;
}) {
  React.useEffect(() => {
    const map = mapRef?.current;
    if (!map) return;
    map.animateCameraTo({
      latitude: target.latitude,
      longitude: target.longitude,
      duration: 500,
    });
  }, [mapRef, target.latitude, target.longitude, token]);
  return null;
}

export function MapUnavailablePanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.fallback}>
      <AppText variant="subtitle">{title}</AppText>
      <AppText variant="body" color="textSecondary">
        {body}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#DCE8E3',
    padding: 24,
    justifyContent: 'center',
    gap: 8,
  },
});
