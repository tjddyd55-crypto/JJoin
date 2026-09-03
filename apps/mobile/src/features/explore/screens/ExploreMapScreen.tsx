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
import { useRouter, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import {
  PresenceVisibility,
  StoreOwnershipStatus,
  type ExploreFilter,
  type ExploreMapResponse,
  type GolfFacilityMapDto,
  type PresenceDurationOption,
  type StoreOwnershipDto,
} from '@jjoin/types';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { getApiClient } from '../../../lib/api';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';
import { fetchExploreMap, REGION_SEARCH_FIXTURES } from '../api/explore-api';
import {
  fetchGolfFacilitiesInRegion,
  fetchNearbyUsersForMap,
  searchGolfFacilitiesForExplore,
} from '../api/golf-facility-explore';
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
import {
  countUniqueCoordinateBuckets,
  filterCoordinatesInBounds,
  regionFromBounds,
  type GeoBounds,
} from '../map/map-geo';
import { logExploreMapMarkerPipeline } from '../map/explore-map-marker-debug';
import { getMapRuntimeStatus } from '../map/map-runtime';
import { resolveVenueForJoin } from '../../join-create/api/resolve-venue-for-join';
import {
  peekJoinCreateDraft,
  saveJoinCreateDraft,
} from '../../join-create/model/join-create-draft';
import { venueSelectionFromVenueDto } from '../../join-create/model/join-create-venue';
import {
  saveClubEventVenueDraft,
} from '../../club/model/club-event-venue-draft';
import {
  GEOJE_DEMO_REGION,
  SEOUL_FALLBACK_REGION,
  type ExploreFilterId,
  type MapBounds,
  type MapCoordinate,
  type MapRegion,
  type SheetMode,
} from '../model/map-types';
import { useJoinDiscoveryOptional } from '../discovery/JoinDiscoveryContext';
import { DEFAULT_NEARBY_RADIUS_METERS } from '@jjoin/domain';
import { isDevelopmentVariant } from '../../../lib/app-variant';

/** GolfFacility DB is default place SoT; Kakao Local remains as fallback. */
type PlaceSource = 'GOLF_FACILITY' | 'KAKAO';

/** DEV starts in Seoul so engagement QA facilities are in-viewport; Production keeps Geoje demo. */
const DEFAULT_MAP_REGION: MapRegion = isDevelopmentVariant()
  ? SEOUL_FALLBACK_REGION
  : GEOJE_DEMO_REGION;

const VIEWPORT_DEBOUNCE_MS = 350;
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_CHARS = 1;
const VENUE_LIST_PAGE_SIZE = 20;

export type ExploreMapScreenProps = {
  /** When embedded in Weekly+Regional Explore — share date/region filter. */
  discoveryLinked?: boolean;
  externalLocation?: MapCoordinate | null;
  externalLocationDenied?: boolean;
};

export function ExploreMapScreen({
  discoveryLinked = false,
  externalLocation = null,
  externalLocationDenied = false,
}: ExploreMapScreenProps = {}) {
  const router = useRouter();
  const params = useLocalSearchParams<{ venuePick?: string; clubEventPick?: string }>();
  const venuePickMode = params.venuePick === '1' || params.venuePick === 'true';
  const clubEventPickClubId = params.clubEventPick?.trim() || null;
  const { requestGatedAction } = useSession();
  const theme = useTheme();
  const store = getSecureSessionStore();
  const discovery = useJoinDiscoveryOptional();
  const mapRef = useRef<MapCameraHandle | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const requestSeq = useRef(0);
  const viewportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [placeSource, setPlaceSource] = useState<PlaceSource>('GOLF_FACILITY');
  const [filter, setFilter] = useState<ExploreFilterId>('ALL');
  const [data, setData] = useState<ExploreMapResponse | null>(null);
  const [searchRegion, setSearchRegion] = useState<MapRegion>(DEFAULT_MAP_REGION);
  const [deviceLocation, setDeviceLocation] = useState<MapCoordinate | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [cameraDirty, setCameraDirty] = useState(false);
  const [lastCameraCenter, setLastCameraCenter] = useState<MapCoordinate>(DEFAULT_MAP_REGION);
  const [cameraKey, setCameraKey] = useState(0);
  const [cameraTarget, setCameraTarget] = useState<MapCoordinate | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [activatingVenue, setActivatingVenue] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>('PEEK');
  const [presence, setPresence] = useState<PresenceVisibility>(PresenceVisibility.HIDDEN);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<ExploreMapResponse['venues']>([]);
  const [searchUnavailable, setSearchUnavailable] = useState<GolfFacilityMapDto[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myStores, setMyStores] = useState<StoreOwnershipDto[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapViewportBounds, setMapViewportBounds] = useState<GeoBounds | null>(null);
  const [venueListLimit, setVenueListLimit] = useState(VENUE_LIST_PAGE_SIZE);
  const [sortFromDeviceLocation, setSortFromDeviceLocation] = useState(false);
  const mapReadySyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runtime = getMapRuntimeStatus();
  const snapPoints = useMemo(
    () =>
      discoveryLinked ? ['14%', '48%', '86%'] : ['11%', '44%', '78%'],
    [discoveryLinked],
  );

  const loadGolfFacilityMap = useCallback(
    async (
      center: MapCoordinate,
      region: MapRegion = searchRegion,
      nextFilter: ExploreFilterId = filter,
    ) => {
      const seq = ++requestSeq.current;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      setError(null);
      try {
        const disc = discoveryLinked ? discovery?.filter : null;
        const regionMode = disc?.region.mode;
        const fetchVenues = nextFilter !== 'USER';
        const fetchUsers = nextFilter === 'USER' || nextFilter === 'ALL';

        let venues: ExploreMapResponse['venues'] = [];
        let users: ExploreMapResponse['users'] = [];

        if (fetchVenues) {
          const result = await fetchGolfFacilitiesInRegion({
            store,
            center,
            region: {
              ...region,
              latitude: center.latitude,
              longitude: center.longitude,
            },
            signal: ac.signal,
            todayJoinOnly: discoveryLinked
              ? true
              : nextFilter === 'TODAY_JOIN',
            includeUsers: false,
            date: disc?.date,
            regionMode,
            sido: disc?.region.mode === 'DISTRICT' ? disc.region.sido : undefined,
            sigungu:
              disc?.region.mode === 'DISTRICT' ? disc.region.sigungu : undefined,
            lat:
              regionMode === 'NEARBY'
                ? (externalLocation ?? deviceLocation)?.latitude
                : (externalLocation ?? deviceLocation)?.latitude,
            lng:
              regionMode === 'NEARBY'
                ? (externalLocation ?? deviceLocation)?.longitude
                : (externalLocation ?? deviceLocation)?.longitude,
            radiusMeters:
              regionMode === 'NEARBY' ? DEFAULT_NEARBY_RADIUS_METERS : undefined,
          });
          if (seq !== requestSeq.current) return;
          venues = result.venues;
        }

        if (fetchUsers) {
          users = await fetchNearbyUsersForMap({
            store,
            center,
            region: {
              ...region,
              latitude: center.latitude,
              longitude: center.longitude,
            },
            signal: ac.signal,
          });
          if (seq !== requestSeq.current) return;
        }

        setData({
          venues,
          users,
          metadata: {
            sportCode: 'SCREEN_GOLF',
            filter: nextFilter as ExploreFilter,
            source: 'live',
            venueCount: venues.length,
            userCount: users.length,
          },
        });
        setVenueListLimit(VENUE_LIST_PAGE_SIZE);
      } catch (e) {
        if (ac.signal.aborted) return;
        if (seq !== requestSeq.current) return;
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'Aborted') return;
        setError(msg || 'explore_error');
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [
      store,
      searchRegion,
      filter,
      discoveryLinked,
      discovery?.filter,
      externalLocation,
      deviceLocation,
    ],
  );

  const loadKakaoMap = useCallback(
    async (
      center: MapCoordinate,
      nextFilter: ExploreFilterId = filter,
      nextQuery: string,
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
    [filter, store, searchRegion],
  );

  const loadMap = useCallback(
    async (
      center: MapCoordinate,
      nextFilter: ExploreFilterId = filter,
      region: MapRegion = searchRegion,
      source: PlaceSource = placeSource,
      kakaoQuery?: string,
    ) => {
      if (source === 'GOLF_FACILITY') {
        await loadGolfFacilityMap(center, region, nextFilter);
        return;
      }
      await loadKakaoMap(center, nextFilter, kakaoQuery ?? '스크린골프', region);
    },
    [filter, placeSource, searchRegion, loadGolfFacilityMap, loadKakaoMap],
  );

  const syncViewportFromMap = useCallback(
    async (reason: string) => {
      if (placeSource !== 'GOLF_FACILITY' || !mapRef.current?.getViewportBounds) return;
      try {
        const vp = await mapRef.current.getViewportBounds();
        const bounds: GeoBounds = {
          west: vp.southWest.longitude,
          south: vp.southWest.latitude,
          east: vp.northEast.longitude,
          north: vp.northEast.latitude,
        };
        setMapViewportBounds(bounds);
        const center = vp.center;
        const region = regionFromBounds(bounds);
        setLastCameraCenter(center);
        setSearchRegion(region);
        await loadGolfFacilityMap(center, region, filter);
        if (__DEV__) {
          console.log('[ExploreMap:viewport]', { reason, bounds });
        }
      } catch {
        /* map not ready */
      }
    },
    [placeSource, filter, loadGolfFacilityMap],
  );

  const handleMapEngineReady = useCallback(() => {
    if (mapReadySyncTimer.current) clearTimeout(mapReadySyncTimer.current);
    mapReadySyncTimer.current = setTimeout(() => {
      void (async () => {
        // Kakao native map may open at a stale Geoje default before JS initialRegion applies.
        // In Development, force Seoul QA viewport before the first bounds sync.
        if (isDevelopmentVariant()) {
          try {
            await mapRef.current?.animateCameraTo?.(
              {
                latitude: DEFAULT_MAP_REGION.latitude,
                longitude: DEFAULT_MAP_REGION.longitude,
              },
              1,
            );
            setLastCameraCenter(DEFAULT_MAP_REGION);
            setSearchRegion(DEFAULT_MAP_REGION);
            await new Promise((r) => setTimeout(r, 200));
          } catch {
            /* fall through to viewport sync */
          }
        }
        await syncViewportFromMap('map-ready');
      })();
    }, 450);
  }, [syncViewportFromMap]);

  useEffect(() => {
    if (!data?.venues) return;
    const inViewport = mapViewportBounds
      ? filterCoordinatesInBounds(data.venues, mapViewportBounds)
      : data.venues;
    logExploreMapMarkerPipeline({
      reason: 'pipeline',
      apiRawCount: data.metadata?.venueCount ?? data.venues.length,
      apiMappedCount: data.venues.length,
      invalidCoordinateCount: 0,
      stateVenueCount: data.venues.length,
      markerDtoCount: data.venues.length,
      viewportBounds: mapViewportBounds,
      inViewportCount: inViewport.length,
      uniqueCoordinateBuckets: countUniqueCoordinateBuckets(data.venues),
    });
  }, [data, mapViewportBounds]);

  useEffect(() => {
    if (!discoveryLinked) return;
    if (externalLocation) {
      setDeviceLocation(externalLocation);
      setLocationDenied(false);
    } else if (externalLocationDenied) {
      setLocationDenied(true);
    }
  }, [discoveryLinked, externalLocation, externalLocationDenied]);

  useEffect(() => {
    if (!discoveryLinked || !discovery?.filter) return;
    void loadMap(lastCameraCenter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    discoveryLinked,
    discovery?.filter.date,
    discovery?.filter.region,
    discovery?.filter.sort,
  ]);

  useEffect(() => {
    if (discoveryLinked && externalLocation) {
      const here = externalLocation;
      setDeviceLocation(here);
      setLastCameraCenter(here);
      setSearchRegion((r) => ({
        ...r,
        latitude: here.latitude,
        longitude: here.longitude,
      }));
      void loadMap(here, filter, {
        ...DEFAULT_MAP_REGION,
        latitude: here.latitude,
        longitude: here.longitude,
      });
      return;
    }
    void (async () => {
      // Development: keep Seoul viewport for facility/join QA (GPS jumps away from seeded data).
      if (isDevelopmentVariant()) {
        await loadMap(DEFAULT_MAP_REGION);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setDeviceLocation({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          } catch {
            /* keep Seoul camera */
          }
        } else {
          setLocationDenied(true);
        }
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        await loadMap(DEFAULT_MAP_REGION);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const here = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setDeviceLocation(here);
        setLastCameraCenter(here);
        setSearchRegion((r) => ({
          ...r,
          latitude: here.latitude,
          longitude: here.longitude,
        }));
        setCameraTarget(here);
        setCameraKey((k) => k + 1);
        await loadMap(here, filter, {
          ...DEFAULT_MAP_REGION,
          latitude: here.latitude,
          longitude: here.longitude,
        });
      } catch {
        await loadMap(DEFAULT_MAP_REGION);
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

  useEffect(() => {
    return () => {
      if (viewportTimer.current) clearTimeout(viewportTimer.current);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (mapReadySyncTimer.current) clearTimeout(mapReadySyncTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (discoveryLinked || venuePickMode) return;
      const api = getApiClient(store);
      void api
        .getMyStores()
        .then((items) =>
          setMyStores(items.filter((s) => s.status === StoreOwnershipStatus.ACTIVE)),
        )
        .catch(() => setMyStores([]));
    }, [discoveryLinked, store, venuePickMode]),
  );

  const selectedVenue = useMemo(
    () => data?.venues.find((v) => v.venueId === selectedVenueId) ?? null,
    [data, selectedVenueId],
  );
  const ownedStoreForVenue = useMemo(() => {
    if (!selectedVenue?.golfFacilityId) return null;
    return (
      myStores.find(
        (store) =>
          store.status === StoreOwnershipStatus.ACTIVE &&
          store.golfFacilityId === selectedVenue.golfFacilityId,
      ) ?? null
    );
  }, [myStores, selectedVenue?.golfFacilityId]);
  const screenCreateJoinLabel = useMemo(() => {
    if (venuePickMode) return '이 장소 선택';
    if (discoveryLinked) return '여기서 조인 만들기';
    if (ownedStoreForVenue) return '모집 조인 만들기';
    return '이 매장에서 조인 만들기';
  }, [discoveryLinked, ownedStoreForVenue, venuePickMode]);
  const selectedUser = useMemo(
    () => data?.users.find((u) => u.userId === selectedUserId) ?? null,
    [data, selectedUserId],
  );

  const sortedVenues = useMemo(() => {
    const venues = data?.venues ?? [];
    if (venues.length <= 1) return venues;
    const ref = sortFromDeviceLocation ? deviceLocation : lastCameraCenter;
    if (!ref) return venues;
    return [...venues].sort((a, b) => {
      const da =
        a.distanceMeters ??
        Math.hypot(a.latitude - ref.latitude, a.longitude - ref.longitude) * 111_000;
      const db =
        b.distanceMeters ??
        Math.hypot(b.latitude - ref.latitude, b.longitude - ref.longitude) * 111_000;
      return da - db;
    });
  }, [data?.venues, sortFromDeviceLocation, deviceLocation, lastCameraCenter]);

  const mapVenues = useMemo(() => {
    if (filter === 'USER') return [];
    return sortedVenues;
  }, [filter, sortedVenues]);

  const mapUsers = useMemo(() => {
    if (filter === 'VENUE' || filter === 'TODAY_JOIN') return [];
    return data?.users ?? [];
  }, [filter, data?.users]);

  const screenPeekSubtitle = useMemo(() => {
    const venueCount = sortedVenues.length;
    const userCount = data?.users.length ?? 0;
    switch (filter) {
      case 'USER':
        return `지금 조인 가능 ${userCount}명`;
      case 'TODAY_JOIN':
        return `오늘 조인 ${venueCount}곳`;
      case 'VENUE':
        return `주변 스크린골프장 ${venueCount}곳`;
      default:
        return `스크린골프장 ${venueCount}곳 · 조인 가능 ${userCount}명`;
    }
  }, [filter, sortedVenues.length, data?.users.length]);

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[ScreenExplore]', {
      viewportFacilities: sortedVenues.length,
      markers: mapVenues.length + mapUsers.length,
      listTotal: sortedVenues.length,
      listVisible: Math.min(venueListLimit, sortedVenues.length),
      filter,
    });
  }, [sortedVenues.length, mapVenues.length, mapUsers.length, venueListLimit, filter]);

  useEffect(() => {
    if (!selectedVenueId) return;
    if (!data?.venues.some((v) => v.venueId === selectedVenueId)) {
      setSelectedVenueId(null);
      setSheetMode((m) => (m === 'VENUE' ? 'PEEK' : m));
      sheetRef.current?.snapToIndex(0);
    }
  }, [data, selectedVenueId]);

  const clearVenueSelection = useCallback(() => {
    setSelectedVenueId(null);
    setSelectedUserId(null);
    setSheetMode('PEEK');
    sheetRef.current?.snapToIndex(0);
  }, []);

  const onVenuePress = (venueId: string) => {
    if (venueId === selectedVenueId && sheetMode === 'VENUE') {
      clearVenueSelection();
      return;
    }
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
    await loadMap(center, filter, nextRegion);
    setCameraDirty(false);
  };

  const scheduleViewportFetch = useCallback(
    (center: MapCoordinate, region: MapRegion) => {
      if (placeSource !== 'GOLF_FACILITY') return;
      if (viewportTimer.current) clearTimeout(viewportTimer.current);
      viewportTimer.current = setTimeout(() => {
        void loadGolfFacilityMap(center, region, filter);
        setCameraDirty(false);
      }, VIEWPORT_DEBOUNCE_MS);
    },
    [placeSource, loadGolfFacilityMap, filter],
  );

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
    setLastCameraCenter(deviceLocation);
    setCameraDirty(false);
    setSortFromDeviceLocation(true);
    const nextRegion = {
      ...searchRegion,
      latitude: deviceLocation.latitude,
      longitude: deviceLocation.longitude,
    };
    setSearchRegion(nextRegion);
    void loadMap(deviceLocation, filter, nextRegion);
  };

  const runGolfFacilitySearch = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (trimmed.length < MIN_SEARCH_CHARS) {
      Alert.alert('검색', '검색어를 입력해 주세요.');
      return;
    }
    setSearchLoading(true);
    try {
      const { venues, unavailable } = await searchGolfFacilitiesForExplore({
        store,
        q: trimmed,
        center: lastCameraCenter,
      });
      setSearchHits(venues);
      setSearchUnavailable(unavailable);
      if (venues.length === 0 && unavailable.length === 0) {
        Alert.alert(
          '검색 결과 없음',
          '등록된 스크린골프장을 찾지 못했습니다. 카카오 장소 검색으로 전환할 수 있습니다.',
        );
        return;
      }
      if (venues.length > 0) {
        setPlaceSource('GOLF_FACILITY');
        setData({
          venues,
          users: data?.users ?? [],
          metadata: {
            sportCode: 'SCREEN_GOLF',
            filter: 'VENUE',
            source: 'live',
            venueCount: venues.length,
            userCount: data?.users.length ?? 0,
          },
        });
        const first = venues[0];
        const fitted = { latitude: first.latitude, longitude: first.longitude };
        setLastCameraCenter(fitted);
        setCameraTarget(fitted);
        setCameraKey((k) => k + 1);
        setSearchRegion((r) => ({
          ...r,
          latitude: fitted.latitude,
          longitude: fitted.longitude,
        }));
        setSelectedVenueId(first.venueId);
        setSheetMode('VENUE');
        sheetRef.current?.snapToIndex(1);
        setSearchOpen(false);
      }
    } catch {
      Alert.alert('검색', '검색에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSearchLoading(false);
    }
  };

  const onSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    if (placeSource !== 'GOLF_FACILITY') return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const trimmed = text.trim();
    if (trimmed.length < MIN_SEARCH_CHARS) {
      setSearchHits([]);
      setSearchUnavailable([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        try {
          const { venues, unavailable } = await searchGolfFacilitiesForExplore({
            store,
            q: trimmed,
            center: lastCameraCenter,
          });
          setSearchHits(venues);
          setSearchUnavailable(unavailable);
        } catch {
          /* keep previous */
        } finally {
          setSearchLoading(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
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
      setSearchRegion(regionHit);
      setLastCameraCenter(regionHit);
      setCameraTarget(regionHit);
      setCameraKey((k) => k + 1);
      setSearchOpen(false);
      setCameraDirty(false);
      void loadMap(regionHit, filter, regionHit);
      return;
    }
    if (placeSource === 'GOLF_FACILITY') {
      void runGolfFacilitySearch(trimmed);
      return;
    }
    setSearchOpen(false);
    setCameraDirty(false);
    void loadKakaoMap(lastCameraCenter, filter, trimmed, searchRegion);
  };

  const switchToKakaoPlaces = () => {
    setPlaceSource('KAKAO');
    setSearchOpen(false);
    void loadKakaoMap(lastCameraCenter, filter, '스크린골프', searchRegion);
  };

  const switchToGolfFacility = () => {
    setPlaceSource('GOLF_FACILITY');
    void loadGolfFacilityMap(lastCameraCenter, searchRegion);
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
    const previous = presence;
    setPresence(PresenceVisibility.HIDDEN);
    try {
      await getApiClient(store).deleteMyPresence();
    } catch {
      setPresence(previous);
      Alert.alert('조인 가능', '상태를 변경하지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const onCameraGesture = (center: MapCoordinate, bounds?: MapBounds) => {
    setLastCameraCenter(center);
    let nextRegion: MapRegion;
    if (bounds) {
      const geoBounds: GeoBounds = {
        west: bounds.southWest.longitude,
        south: bounds.southWest.latitude,
        east: bounds.northEast.longitude,
        north: bounds.northEast.latitude,
      };
      setMapViewportBounds(geoBounds);
      nextRegion = regionFromBounds(geoBounds);
      setSearchRegion(nextRegion);
    } else {
      nextRegion = {
        ...searchRegion,
        latitude: center.latitude,
        longitude: center.longitude,
      };
      setSearchRegion(nextRegion);
    }
    setCameraDirty(true);
    setSortFromDeviceLocation(false);
    scheduleViewportFetch(center, nextRegion);
  };

  const mapUnavailable =
    runtime.kind === 'missing_native_key' ? (
      <MapUnavailablePanel
        title="지도를 불러올 수 없습니다"
        body={
          isInternalToolsEnabled()
            ? 'Kakao Developers에서 Native App Key를 발급해 apps/mobile/.env 의 EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY에 설정한 뒤 Development Build를 재생성하세요.'
            : '잠시 후 다시 시도해 주세요. 문제가 계속되면 앱을 재시작해 주세요.'
        }
      />
    ) : runtime.kind === 'expo_go_unsupported' ? (
      <MapUnavailablePanel
        title="지도를 사용할 수 없습니다"
        body={
          isInternalToolsEnabled()
            ? 'Kakao Map은 Expo Go에서 사용할 수 없습니다. Development Build를 사용하세요.'
            : '이 기기에서는 지도를 표시할 수 없습니다.'
        }
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
        venues={mapVenues}
        users={mapUsers}
        selectedVenueId={selectedVenueId}
        selectedUserId={selectedUserId}
        onCameraGesture={onCameraGesture}
        onMapEngineReady={handleMapEngineReady}
        onVenuePress={onVenuePress}
        onUserPress={onUserPress}
      />
    );

  const rowBorder = { borderBottomColor: theme.colors.border.subtle };

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: theme.colors.app.background }]}>
      <View style={styles.mapArea}>
        {mapNode}

        <View
          style={[
            styles.topChrome,
            { top: spacing.xs },
          ]}
          pointerEvents="box-none"
        >
          <MapSearchBar compact onPress={() => setSearchOpen(true)} />
          <MapFilterBar
            compact
            value={filter}
            onChange={(next) => {
              if (loading) return;
              setFilter(next);
              void loadMap(lastCameraCenter, next);
            }}
          />
          {locationDenied ? (
            <Text variant="caption" tone="warning" style={styles.statusLine}>
              위치 권한 없음 · 지역 검색은 가능합니다
            </Text>
          ) : null}
          {error ? (
            <Text variant="caption" tone="error" style={styles.statusLine}>
              검색 오류 · 지도는 유지됩니다
            </Text>
          ) : null}
          {loading ? (
            <Text variant="caption" tone="tertiary" style={styles.statusLine}>
              주변 불러오는 중…
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.fabCol,
            { bottom: discoveryLinked ? '16%' : '13%' },
          ]}
          pointerEvents="box-none"
        >
          {cameraDirty && placeSource === 'KAKAO' ? (
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
        onChange={(index) => setSheetIndex(index)}
        backgroundStyle={{ backgroundColor: theme.colors.surface.elevated }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.border.strong }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <ExploreBottomSheetBody
            mode={sheetMode}
            compactPeek={!discoveryLinked && sheetIndex === 0 && sheetMode === 'PEEK'}
            venues={sortedVenues}
            users={mapUsers}
            mapFilter={filter}
            venueListLimit={venueListLimit}
            onLoadMoreVenues={() =>
              setVenueListLimit((n) => n + VENUE_LIST_PAGE_SIZE)
            }
            selectedVenue={selectedVenue}
            selectedUser={selectedUser}
            presence={presence}
            showPresence={discoveryLinked}
            peekTitle={discoveryLinked ? '조인이 있는 장소' : '주변 스크린골프장'}
            peekSubtitle={
              discoveryLinked
                ? `선택일 기준 조인 장소 ${sortedVenues.length}곳`
                : screenPeekSubtitle
            }
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
                if (
                  !venuePickMode &&
                  !discoveryLinked &&
                  ownedStoreForVenue
                ) {
                  const gate = requestGatedAction({ type: 'CREATE_JOIN' });
                  if (!gate.allowed) {
                    router.push('/auth/gate');
                    return;
                  }
                  router.push({
                    pathname: '/my/create-store-join',
                    params: { storeOwnershipId: ownedStoreForVenue.id },
                  });
                  return;
                }
                if (!selectedVenue?.canCreateJoin) {
                  if (
                    selectedVenue?.source === 'GOLF_FACILITY' &&
                    !selectedVenue.canCreateJoin
                  ) {
                    Alert.alert(
                      '조인 장소',
                      '위치 정보 확인 중인 시설입니다. 다른 장소를 선택해 주세요.',
                    );
                    return;
                  }
                  Alert.alert('조인 만들기', '이 장소에서는 조인을 만들 수 없습니다.');
                  return;
                }
                if (!venuePickMode) {
                  const gate = requestGatedAction({ type: 'CREATE_JOIN' });
                  if (!gate.allowed) {
                    router.push('/auth/gate');
                    return;
                  }
                }
                if (activatingVenue) return;
                setActivatingVenue(true);
                try {
                  const api = getApiClient(getSecureSessionStore());
                  const resolved = await resolveVenueForJoin(api, selectedVenue);
                  const venueSelection = venueSelectionFromVenueDto({
                    venueId: resolved.venueId,
                    name: resolved.name,
                    address: resolved.address,
                    roadAddress: resolved.address,
                    phone: resolved.phone,
                    latitude: resolved.latitude,
                    longitude: resolved.longitude,
                    golfFacilityId: selectedVenue.golfFacilityId,
                  });
                  if (clubEventPickClubId) {
                    saveClubEventVenueDraft({
                      clubId: clubEventPickClubId,
                      selectedVenue: venueSelection,
                    });
                    router.back();
                    return;
                  }
                  if (venuePickMode) {
                    const draft = peekJoinCreateDraft();
                    saveJoinCreateDraft({
                      players: draft?.players ?? 4,
                      selectedVenue: venueSelection,
                    });
                  }

                  router.push({
                    pathname: '/(tabs)/create',
                    params: {
                      venueId: resolved.venueId,
                      venueName: resolved.name,
                      venueAddress: resolved.address,
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
            onDismissSelection={clearVenueSelection}
            createJoinLabel={screenCreateJoinLabel}
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
            onChangeText={onSearchQueryChange}
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
            style={[styles.searchRow, rowBorder]}
            onPress={() => applyKeywordSearch(searchQuery)}
            disabled={loading || searchLoading}
          >
            <Text variant="body" tone="link">
              {searchLoading ? '검색 중…' : '검색'}
            </Text>
          </Pressable>
          {searchHits.map((v) => (
            <Pressable
              key={v.venueId}
              style={[styles.searchRow, rowBorder]}
              onPress={() => {
                setPlaceSource('GOLF_FACILITY');
                setData({
                  venues: searchHits,
                  users: data?.users ?? [],
                  metadata: {
                    sportCode: 'SCREEN_GOLF',
                    filter: 'VENUE',
                    source: 'live',
                    venueCount: searchHits.length,
                    userCount: data?.users.length ?? 0,
                  },
                });
                const fitted = { latitude: v.latitude, longitude: v.longitude };
                setLastCameraCenter(fitted);
                setCameraTarget(fitted);
                setCameraKey((k) => k + 1);
                setSelectedVenueId(v.venueId);
                setSheetMode('VENUE');
                sheetRef.current?.snapToIndex(1);
                setSearchOpen(false);
              }}
            >
              <Text variant="body" tone="primary">
                {v.name}
              </Text>
              <Text variant="caption" tone="secondary">
                {v.categoryName ?? ''} · {v.roadAddress ?? v.regionLabel ?? ''}
              </Text>
            </Pressable>
          ))}
          {searchUnavailable.map((f) => (
            <Pressable
              key={f.id}
              style={[styles.searchRow, rowBorder]}
              onPress={() =>
                Alert.alert('위치 정보', '위치 정보 확인 중인 시설입니다.')
              }
            >
              <Text variant="body" tone="secondary">
                {f.displayName}
              </Text>
              <Text variant="caption" tone="warning">
                위치 정보 확인 중 · 선택 불가
              </Text>
            </Pressable>
          ))}
          {['거제', '부산', '서울', '골프존', 'SG골프', '스크린골프'].map((k) => (
            <Pressable
              key={k}
              style={[styles.searchRow, rowBorder]}
              onPress={() => applyKeywordSearch(k)}
            >
              <Text variant="body" tone="primary">
                {k}
              </Text>
            </Pressable>
          ))}
          {placeSource === 'GOLF_FACILITY' ? (
            <Pressable style={[styles.searchRow, rowBorder]} onPress={switchToKakaoPlaces}>
              <Text variant="body" tone="link">
                찾는 장소가 없나요? · 카카오 장소 검색
              </Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.searchRow, rowBorder]} onPress={switchToGolfFacility}>
              <Text variant="body" tone="link">
                스크린골프장 DB로 돌아가기
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.searchRow, rowBorder]}
            onPress={() => {
              setSearchOpen(false);
              goMyLocation();
            }}
          >
            <Text variant="body" tone="link">
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
  mapArea: { flex: 1, backgroundColor: 'transparent' },
  topChrome: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    gap: spacing.xs,
  },
  statusLine: {
    marginTop: -2,
  },
  fabCol: {
    position: 'absolute',
    right: spacing.md,
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  sheetContent: {
    paddingBottom: spacing.md,
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
