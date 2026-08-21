import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useRouter, type Href } from 'expo-router';
import {
  PresenceVisibility,
  type ExploreFilter,
  type ExploreMapResponse,
  type PresenceDurationOption,
} from '@jjoin/types';
import { AppText, colors, spacing } from '@jjoin/design-system';
import type { NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { getApiClient } from '../../../lib/api';
import { fetchExploreMap, REGION_SEARCH_FIXTURES } from '../api/explore-api';
import {
  CurrentLocationButton,
  MapFilterBar,
  MapSearchBar,
  ReSearchAreaButton,
} from '../components/MapChrome';
import { ExploreBottomSheetBody } from '../components/ExploreBottomSheetBody';
import { MapUnavailablePanel, NaverMapAdapter } from '../map/NaverMapAdapter';
import { getNaverMapRuntimeStatus } from '../map/map-runtime';
import {
  GEOJE_DEMO_REGION,
  type ExploreFilterId,
  type MapCoordinate,
  type MapRegion,
  type SheetMode,
} from '../model/map-types';

export function ExploreMapScreen() {
  const router = useRouter();
  const store = getSecureSessionStore();
  const mapRef = useRef<NaverMapViewRef | null>(null);
  const sheetRef = useRef<BottomSheet>(null);

  const [filter, setFilter] = useState<ExploreFilterId>('ALL');
  const [data, setData] = useState<ExploreMapResponse | null>(null);
  const [searchRegion, setSearchRegion] = useState<MapRegion>(GEOJE_DEMO_REGION);
  const [deviceLocation, setDeviceLocation] = useState<MapCoordinate | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [cameraDirty, setCameraDirty] = useState(false);
  const [lastCameraCenter, setLastCameraCenter] = useState<MapCoordinate>(GEOJE_DEMO_REGION);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraTarget, setCameraTarget] = useState<MapCoordinate | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>('PEEK');
  const [presence, setPresence] = useState<PresenceVisibility>(PresenceVisibility.HIDDEN);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runtime = getNaverMapRuntimeStatus();
  const snapPoints = useMemo(() => ['28%', '52%', '88%'], []);

  const loadMap = useCallback(
    async (center: MapCoordinate, nextFilter: ExploreFilterId = filter) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchExploreMap({
          store,
          filter: nextFilter as ExploreFilter,
          center,
        });
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'explore_error');
      } finally {
        setLoading(false);
      }
    },
    [filter, store],
  );

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        await loadMap(GEOJE_DEMO_REGION);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coord = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setDeviceLocation(coord);
        // Product scenario: keep Explore demo on Geoje for Venue fixtures;
        // device location still drives "내 위치" marker + FAB.
        setLastCameraCenter(GEOJE_DEMO_REGION);
        await loadMap(GEOJE_DEMO_REGION);
      } catch {
        await loadMap(GEOJE_DEMO_REGION);
      }
    })();
  }, [loadMap]);

  useEffect(() => {
    void (async () => {
      try {
        const p = await getApiClient(store).getMyPresence();
        setPresence(p.visibility);
      } catch {
        /* offline ok */
      }
    })();
  }, [store]);

  const selectedVenue = useMemo(
    () => data?.venues.find((v) => v.venueId === selectedVenueId) ?? null,
    [data, selectedVenueId],
  );
  const selectedUser = useMemo(
    () => data?.users.find((u) => u.userId === selectedUserId) ?? null,
    [data, selectedUserId],
  );

  const onVenuePress = (venueId: string) => {
    setSelectedVenueId(venueId);
    setSelectedUserId(null);
    setSheetMode('VENUE');
    sheetRef.current?.snapToIndex(1);
  };

  const onUserPress = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedVenueId(null);
    setSheetMode('USER');
    sheetRef.current?.snapToIndex(1);
  };

  const onReSearch = async () => {
    const center = lastCameraCenter;
    setSearchRegion({
      ...searchRegion,
      latitude: center.latitude,
      longitude: center.longitude,
    });
    await loadMap(center);
    setCameraDirty(false);
  };

  const goMyLocation = () => {
    if (!deviceLocation) {
      Alert.alert(
        '현재 위치 없음',
        locationDenied
          ? '위치 권한이 없어 현재 위치를 사용할 수 없습니다. 지역 검색으로 탐색할 수 있습니다.'
          : '위치를 아직 가져오지 못했습니다.',
      );
      return;
    }
    setCameraTarget(deviceLocation);
    setCameraKey((k) => k + 1);
    setCameraDirty(false);
  };

  const applyRegionSearch = (keyword: string) => {
    const region = REGION_SEARCH_FIXTURES[keyword];
    if (!region) {
      Alert.alert('검색', '데모 지역: 거제 / 부산 / 서울');
      return;
    }
    setSearchRegion(region);
    setLastCameraCenter(region);
    setCameraTarget(region);
    setCameraKey((k) => k + 1);
    setSearchOpen(false);
    setCameraDirty(false);
    void loadMap(region);
  };

  const activatePresence = async (duration: PresenceDurationOption) => {
    const coord = deviceLocation ?? {
      latitude: searchRegion.latitude,
      longitude: searchRegion.longitude,
    };
    try {
      const p = await getApiClient(store).putMyPresence({
        latitude: coord.latitude,
        longitude: coord.longitude,
        accuracyMeters: 35,
        duration,
      });
      setPresence(p.visibility);
      setSheetMode('PEEK');
      sheetRef.current?.snapToIndex(0);
      await loadMap(lastCameraCenter);
    } catch {
      Alert.alert(
        '지금 조인 가능',
        '서버에 연결하지 못해 활성화할 수 없습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.',
      );
    }
  };

  const turnOffPresence = async () => {
    try {
      await getApiClient(store).deleteMyPresence();
    } catch {
      /* ignore */
    }
    setPresence(PresenceVisibility.HIDDEN);
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <View style={styles.mapArea}>
        {runtime.kind === 'missing_client_id' ? (
          <MapUnavailablePanel
            title="Naver Map Client ID 필요"
            body="EXPO_PUBLIC_NAVER_MAP_CLIENT_ID를 설정한 뒤 Development Build로 실행하세요. Expo Go에서는 네이버 지도가 동작하지 않습니다."
          />
        ) : runtime.kind === 'expo_go_unsupported' ? (
          <MapUnavailablePanel
            title="Development Build 필요"
            body="네이버 지도는 Expo Go에서 사용할 수 없습니다. prebuild 후 expo run:android / run:ios 로 Dev Client를 사용하세요."
          />
        ) : (
          <NaverMapAdapter
            mapRef={mapRef}
            initialRegion={searchRegion}
            cameraKey={cameraKey}
            cameraTarget={cameraTarget}
            myLocation={deviceLocation}
            venues={data?.venues ?? []}
            users={data?.users ?? []}
            selectedVenueId={selectedVenueId}
            selectedUserId={selectedUserId}
            onCameraGesture={(center) => {
              setLastCameraCenter(center);
              setCameraDirty(true);
            }}
            onVenuePress={onVenuePress}
            onUserPress={onUserPress}
          />
        )}

        <View style={styles.topChrome} pointerEvents="box-none">
          <MapSearchBar onPress={() => setSearchOpen(true)} />
          <MapFilterBar
            value={filter}
            onChange={(next) => {
              setFilter(next);
              void loadMap(lastCameraCenter, next);
            }}
          />
          {locationDenied ? (
            <AppText variant="caption" color="warning">
              위치 권한 없음 · 지역 검색은 가능합니다
            </AppText>
          ) : null}
          {error ? (
            <AppText variant="caption" color="danger">
              검색 오류 · 지도는 유지됩니다
            </AppText>
          ) : null}
          {loading ? (
            <AppText variant="caption" color="textSecondary">
              주변 불러오는 중…
            </AppText>
          ) : null}
        </View>

        <View style={styles.fabCol} pointerEvents="box-none">
          {cameraDirty ? <ReSearchAreaButton onPress={() => void onReSearch()} /> : null}
          <CurrentLocationButton onPress={goMyLocation} />
        </View>
      </View>

      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        onChange={(index) => {
          if (index === 0 && sheetMode !== 'PRESENCE_PRIVACY' && sheetMode !== 'PRESENCE_DURATION') {
            // keep selection when peeking slightly
          }
        }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <ExploreBottomSheetBody
            mode={sheetMode}
            venues={data?.venues ?? []}
            users={data?.users ?? []}
            selectedVenue={selectedVenue}
            selectedUser={selectedUser}
            presence={presence}
            onSelectVenue={onVenuePress}
            onSelectUser={onUserPress}
            onOpenPresence={() => {
              if (presence === PresenceVisibility.AVAILABLE) {
                void turnOffPresence();
                return;
              }
              setSheetMode('PRESENCE_PRIVACY');
              sheetRef.current?.snapToIndex(1);
            }}
            onConfirmPrivacy={() => setSheetMode('PRESENCE_DURATION')}
            onCancelPresence={() => {
              setSheetMode('PEEK');
              sheetRef.current?.snapToIndex(0);
            }}
            onPickDuration={(d) => void activatePresence(d)}
            onCreateJoin={() => router.push('/(tabs)/create')}
            onVenueDetail={() => {
              Alert.alert('장소 상세', 'VENUE_01_Detail — 다음 슬라이스에서 연결');
            }}
            onOpenProfile={() => {
              if (selectedUserId) router.push(`/user/${selectedUserId}`);
            }}
            onJoinPress={(joinId) => {
              router.push({ pathname: '/join/[joinId]', params: { joinId } } as Href);
            }}
          />
        </BottomSheetScrollView>
      </BottomSheet>

      <Modal visible={searchOpen} animationType="slide" onRequestClose={() => setSearchOpen(false)}>
        <View style={styles.searchModal}>
          <AppText variant="subtitle">지역 검색</AppText>
          <AppText variant="caption" color="textSecondary">
            기기 GPS와 검색 지역을 분리합니다. (거제 / 부산 / 서울)
          </AppText>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="예: 거제"
            style={styles.input}
            autoFocus
          />
          {['거제', '부산', '서울'].map((k) => (
            <Pressable key={k} style={styles.searchRow} onPress={() => applyRegionSearch(k)}>
              <AppText variant="body">{k}</AppText>
            </Pressable>
          ))}
          <Pressable
            style={styles.searchRow}
            onPress={() => {
              setSearchOpen(false);
              goMyLocation();
            }}
          >
            <AppText variant="body" color="primary">
              현재 위치로
            </AppText>
          </Pressable>
          <Pressable onPress={() => setSearchOpen(false)}>
            <AppText variant="body" color="textSecondary">
              닫기
            </AppText>
          </Pressable>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  mapArea: { flex: 1 },
  topChrome: {
    position: 'absolute',
    top: 52,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  fabCol: {
    position: 'absolute',
    right: spacing.md,
    bottom: '32%',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  searchModal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  searchRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
