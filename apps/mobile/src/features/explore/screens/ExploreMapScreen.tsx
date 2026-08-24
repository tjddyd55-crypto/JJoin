import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
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
import { defaultVenueSearchQuery } from '@jjoin/domain';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { getApiClient } from '../../../lib/api';
import { fetchExploreMap, REGION_SEARCH_FIXTURES } from '../api/explore-api';
import {
  CurrentLocationButton,
  MapFilterBar,
  MapSearchBar,
  ReSearchAreaButton,
} from '../components/MapChrome';
import { ExploreBottomSheetBody } from '../components/ExploreBottomSheetBody';
import { KakaoMapAdapter } from '../map/KakaoMapAdapter';
import { MapUnavailablePanel } from '../map/MapUnavailablePanel';
import type { MapCameraHandle } from '../map/map-handle';
import { regionFromBounds } from '../map/map-geo';
import { getMapRuntimeStatus } from '../map/map-runtime';
import {
  GEOJE_DEMO_REGION,
  type ExploreFilterId,
  type MapBounds,
  type MapCoordinate,
  type MapRegion,
  type SheetMode,
} from '../model/map-types';

export function ExploreMapScreen() {
  const router = useRouter();
  const { requestGatedAction } = useSession();
  const theme = useTheme();
  const store = getSecureSessionStore();
  const mapRef = useRef<MapCameraHandle | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const requestSeq = useRef(0);

  const [filter, setFilter] = useState<ExploreFilterId>('ALL');
  const [data, setData] = useState<ExploreMapResponse | null>(null);
  const [searchRegion, setSearchRegion] = useState<MapRegion>(GEOJE_DEMO_REGION);
  const [venueQuery, setVenueQuery] = useState(defaultVenueSearchQuery('SCREEN_GOLF'));
  const [deviceLocation, setDeviceLocation] = useState<MapCoordinate | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [cameraDirty, setCameraDirty] = useState(false);
  const [lastCameraCenter, setLastCameraCenter] = useState<MapCoordinate>(GEOJE_DEMO_REGION);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraTarget, setCameraTarget] = useState<MapCoordinate | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [activatingVenue, setActivatingVenue] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>('PEEK');
  const [presence, setPresence] = useState<PresenceVisibility>(PresenceVisibility.HIDDEN);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runtime = getMapRuntimeStatus();
  const snapPoints = useMemo(() => ['28%', '52%', '88%'], []);

  const loadMap = useCallback(
    async (
      center: MapCoordinate,
      nextFilter: ExploreFilterId = filter,
      nextQuery: string = venueQuery,
      region: MapRegion = searchRegion,
    ) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchExploreMap({
          store,
          filter: nextFilter as ExploreFilter,
          center,
          region: {
            ...region,
            latitude: center.latitude,
            longitude: center.longitude,
          },
          query: nextQuery,
        });
        if (seq !== requestSeq.current) return;
        setData(result);
        if (nextQuery.trim() && result.venues.length > 0) {
          const first = result.venues[0];
          const inView =
            Math.abs(first.latitude - center.latitude) < region.latitudeDelta &&
            Math.abs(first.longitude - center.longitude) < region.longitudeDelta;
          if (!inView) {
            const fitted: MapCoordinate = {
              latitude: first.latitude,
              longitude: first.longitude,
            };
            setLastCameraCenter(fitted);
            setCameraTarget(fitted);
            setCameraKey((k) => k + 1);
            setSearchRegion((r) => ({
              ...r,
              latitude: fitted.latitude,
              longitude: fitted.longitude,
            }));
          }
        }
      } catch (e) {
        if (seq !== requestSeq.current) return;
        setError(e instanceof Error ? e.message : 'explore_error');
        Alert.alert('장소 검색', '장소를 불러오지 못했습니다. 다시 시도해주세요.');
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [filter, store, venueQuery, searchRegion],
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
        setDeviceLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLastCameraCenter(GEOJE_DEMO_REGION);
        await loadMap(GEOJE_DEMO_REGION);
      } catch {
        await loadMap(GEOJE_DEMO_REGION);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (loading) return;
    const center = lastCameraCenter;
    const nextRegion = {
      ...searchRegion,
      latitude: center.latitude,
      longitude: center.longitude,
    };
    setSearchRegion(nextRegion);
    await loadMap(center, filter, venueQuery, nextRegion);
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

  const applyKeywordSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      Alert.alert('검색', '검색어를 입력해 주세요.');
      return;
    }
    if (loading) return;
    const regionHit = REGION_SEARCH_FIXTURES[trimmed];
    if (regionHit) {
      const defaultQ = defaultVenueSearchQuery('SCREEN_GOLF');
      setSearchRegion(regionHit);
      setLastCameraCenter(regionHit);
      setCameraTarget(regionHit);
      setCameraKey((k) => k + 1);
      setVenueQuery(defaultQ);
      setSearchOpen(false);
      setCameraDirty(false);
      void loadMap(regionHit, filter, defaultQ, regionHit);
      return;
    }
    setVenueQuery(trimmed);
    setSearchOpen(false);
    setCameraDirty(false);
    void loadMap(lastCameraCenter, filter, trimmed, searchRegion);
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

  const onCameraGesture = (center: MapCoordinate, bounds?: MapBounds) => {
    setLastCameraCenter(center);
    if (bounds) {
      const next = regionFromBounds({
        west: bounds.southWest.longitude,
        south: bounds.southWest.latitude,
        east: bounds.northEast.longitude,
        north: bounds.northEast.latitude,
      });
      setSearchRegion(next);
    } else {
      setSearchRegion((prev) => ({
        ...prev,
        latitude: center.latitude,
        longitude: center.longitude,
      }));
    }
    setCameraDirty(true);
  };

  const mapUnavailable =
    runtime.kind === 'missing_native_key' ? (
      <MapUnavailablePanel
        title="Kakao Map Native App Key 필요"
        body="Kakao Developers에서 Native App Key를 발급해 apps/mobile/.env 의 EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY에 설정한 뒤 Development Build를 재생성하세요. (REST API Key와 다릅니다. package: com.jjoin.app + Android key hash 등록 필요)"
      />
    ) : runtime.kind === 'expo_go_unsupported' ? (
      <MapUnavailablePanel
        title="Development Build 필요"
        body="Kakao Map은 Expo Go에서 사용할 수 없습니다. prebuild 후 expo run:android 로 Dev Client를 사용하세요."
      />
    ) : null;

  const mapNode =
    mapUnavailable ?? (
      <KakaoMapAdapter
        mapRef={mapRef}
        initialRegion={searchRegion}
        cameraKey={cameraKey}
        cameraTarget={cameraTarget}
        myLocation={deviceLocation}
        venues={data?.venues ?? []}
        users={data?.users ?? []}
        selectedVenueId={selectedVenueId}
        selectedUserId={selectedUserId}
        onCameraGesture={onCameraGesture}
        onVenuePress={onVenuePress}
        onUserPress={onUserPress}
      />
    );

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.colors.app.background }]}>
      <View style={styles.mapArea}>
        {mapNode}

        <View style={styles.topChrome} pointerEvents="box-none">
          <MapSearchBar onPress={() => setSearchOpen(true)} />
          <MapFilterBar
            value={filter}
            onChange={(next) => {
              if (loading) return;
              setFilter(next);
              void loadMap(lastCameraCenter, next);
            }}
          />
          {locationDenied ? (
            <Text variant="caption" tone="warning">
              위치 권한 없음 · 지역 검색은 가능합니다
            </Text>
          ) : null}
          {error ? (
            <Text variant="caption" tone="error">
              검색 오류 · 지도는 유지됩니다
            </Text>
          ) : null}
          {loading ? (
            <Text variant="caption" tone="tertiary">
              주변 불러오는 중…
            </Text>
          ) : null}
        </View>

        <View style={styles.fabCol} pointerEvents="box-none">
          {cameraDirty ? (
            <ReSearchAreaButton onPress={() => void onReSearch()} />
          ) : null}
          <CurrentLocationButton onPress={goMyLocation} />
        </View>
      </View>

      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: theme.colors.surface.elevated }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border.strong }}
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
            onCreateJoin={() => {
              void (async () => {
                if (!selectedVenue?.canCreateJoin) {
                  Alert.alert('조인 만들기', '이 장소에서는 조인을 만들 수 없습니다.');
                  return;
                }
                const gate = requestGatedAction({ type: 'CREATE_JOIN' });
                if (!gate.allowed) {
                  router.push('/auth/gate');
                  return;
                }
                if (activatingVenue) return;
                setActivatingVenue(true);
                try {
                  const api = getApiClient(getSecureSessionStore());
                  const provider =
                    selectedVenue.source === 'MOCK' || selectedVenue.provider === 'MOCK'
                      ? 'MOCK'
                      : 'KAKAO';
                  const providerPlaceId =
                    selectedVenue.providerPlaceId ?? selectedVenue.venueId;
                  const activated = selectedVenue.jjoinVenueId
                    ? await api.getVenue(selectedVenue.jjoinVenueId)
                    : await api.activateVenue({
                        provider,
                        providerPlaceId,
                        resolveHint: {
                          latitude: selectedVenue.latitude,
                          longitude: selectedVenue.longitude,
                          query: selectedVenue.name,
                        },
                      });
                  router.push({
                    pathname: '/(tabs)/create',
                    params: {
                      venueId: activated.venueId,
                      venueName: activated.name,
                      venueAddress:
                        activated.roadAddress ?? activated.address ?? '',
                    },
                  } as Href);
                } catch {
                  Alert.alert(
                    '장소 확인 실패',
                    '장소 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
                  );
                } finally {
                  setActivatingVenue(false);
                }
              })();
            }}
            onVenueDetail={() => {
              const url = selectedVenue?.placeUrl;
              if (url) {
                void Linking.openURL(url);
                return;
              }
              Alert.alert('장소 상세', '연결된 외부 지도 링크가 없습니다.');
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
        <View style={[styles.searchModal, { backgroundColor: theme.colors.app.background }]}>
          <Text variant="sectionTitle" tone="primary">
            장소 / 지역 검색
          </Text>
          <Text variant="caption" tone="secondary">
            예: 스크린골프, 골프존, SG골프, 서울 스크린골프 · 지역 단축: 거제/부산/서울
          </Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="검색어 입력 후 검색"
            placeholderTextColor={theme.colors.text.tertiary}
            style={[
              styles.input,
              {
                borderColor: theme.colors.border.subtle,
                backgroundColor: theme.colors.surface.card,
                color: theme.colors.text.primary,
                borderRadius: theme.radius.md,
              },
            ]}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => applyKeywordSearch(searchQuery)}
          />
          <Pressable
            style={[styles.searchRow, { borderBottomColor: theme.colors.border.subtle }]}
            onPress={() => applyKeywordSearch(searchQuery)}
            disabled={loading}
          >
            <Text variant="body" style={{ color: theme.colors.action.primary }}>
              검색
            </Text>
          </Pressable>
          {['거제', '부산', '서울', '골프존', 'SG골프', '스크린골프'].map((k) => (
            <Pressable
              key={k}
              style={[styles.searchRow, { borderBottomColor: theme.colors.border.subtle }]}
              onPress={() => applyKeywordSearch(k)}
            >
              <Text variant="body" tone="primary">
                {k}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.searchRow, { borderBottomColor: theme.colors.border.subtle }]}
            onPress={() => {
              setSearchOpen(false);
              goMyLocation();
            }}
          >
            <Text variant="body" style={{ color: theme.colors.action.primary }}>
              현재 위치로
            </Text>
          </Pressable>
          <Pressable onPress={() => setSearchOpen(false)}>
            <Text variant="body" tone="secondary">
              닫기
            </Text>
          </Pressable>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Transparent so Kakao SurfaceView punch-through can show base tiles.
  mapArea: { flex: 1, backgroundColor: 'transparent' },
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
    paddingBottom: spacing.xl,
  },
  searchModal: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    padding: spacing.md,
  },
  searchRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
