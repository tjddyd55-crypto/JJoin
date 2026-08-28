import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import {
  DEFAULT_NEARBY_RADIUS_METERS,
  buildRegionBreadcrumb,
  localDayKey,
  regionExploreHasChildren,
} from '@jjoin/domain';
import type {
  DiscoverFacilityJoinItemDto,
  DiscoverRegionSummaryItemDto,
} from '@jjoin/types';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { getApiClient } from '../../../lib/api';
import { RegionDateSelector } from './components/RegionDateSelector';
import { RegionSummaryList } from './components/RegionSummaryList';
import { RegionFacilityList } from './components/RegionFacilityList';
import { RegionJoinListPanel } from './components/RegionJoinListPanel';
import {
  fetchFacilityJoins,
  fetchRegionSummary,
} from './api/region-explore-api';

type ExploreView =
  | { kind: 'root' }
  | { kind: 'regions'; sido: string; sigungu?: string; title: string }
  | { kind: 'nearby' }
  | {
      kind: 'facilities';
      title: string;
      regionMode: 'NEARBY' | 'DISTRICT';
      sido?: string;
      sigungu?: string;
    }
  | {
      kind: 'joins';
      venueId: string;
      venueName: string;
      sido: string;
      sigungu: string;
      title: string;
    };

type Props = {
  onSwitchToMap?: () => void;
};

export function RegionJoinExploreScreen({ onSwitchToMap }: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [selectedDate, setSelectedDate] = useState(() => localDayKey(new Date()));
  const [viewStack, setViewStack] = useState<ExploreView[]>([{ kind: 'root' }]);
  const [summaryItems, setSummaryItems] = useState<
    DiscoverRegionSummaryItemDto[]
  >([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const [facilityData, setFacilityData] = useState<{
    facilities: DiscoverFacilityJoinItemDto[];
    totalJoinCount: number;
    regionLabel: string;
  } | null>(null);
  const [facilityLoading, setFacilityLoading] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);
  const [deviceLocation, setDeviceLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const requestSeq = useRef(0);

  const currentView = viewStack[viewStack.length - 1]!;

  const headerTitle = useMemo(() => {
    if (currentView.kind === 'root') return '지역별 조인';
    if (currentView.kind === 'nearby') return '내 위치';
    return currentView.title;
  }, [currentView]);

  const breadcrumbs = useMemo(() => {
    if (currentView.kind === 'regions') {
      return buildRegionBreadcrumb(currentView.sido, currentView.sigungu);
    }
    if (currentView.kind === 'facilities' && currentView.sido && currentView.sigungu) {
      return buildRegionBreadcrumb(currentView.sido, currentView.sigungu);
    }
    return [];
  }, [currentView]);

  const popView = useCallback(() => {
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (viewStack.length > 1) {
        popView();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [viewStack.length, popView]);

  const loadSummary = useCallback(async () => {
    const seq = ++requestSeq.current;
    setSummaryLoading(true);
    setSummaryError(null);
    const abort = new AbortController();
    try {
      let sido: string | undefined;
      let sigungu: string | undefined;
      if (currentView.kind === 'regions') {
        sido = currentView.sido;
        sigungu = currentView.sigungu;
      } else if (currentView.kind === 'root') {
        sido = undefined;
        sigungu = undefined;
      } else {
        if (seq === requestSeq.current) setSummaryLoading(false);
        return;
      }

      const res = await fetchRegionSummary(
        api,
        { date: selectedDate, joinability: 'JOINABLE', sido, sigungu },
        abort.signal,
      );
      if (seq !== requestSeq.current) return;
      setSummaryItems(res.items);
    } catch {
      if (seq !== requestSeq.current) return;
      setSummaryItems([]);
      setSummaryError('지역 정보를 불러오지 못했습니다.');
    } finally {
      if (seq === requestSeq.current) setSummaryLoading(false);
    }
  }, [api, selectedDate, currentView]);

  const loadNearbyCount = useCallback(async () => {
    if (!deviceLocation) {
      setNearbyCount(null);
      return;
    }
    try {
      const res = await fetchFacilityJoins(api, {
        date: selectedDate,
        joinability: 'JOINABLE',
        regionMode: 'NEARBY',
        lat: deviceLocation.latitude,
        lng: deviceLocation.longitude,
        radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
        sort: 'DISTANCE',
      });
      setNearbyCount(res.totalJoinCount);
    } catch {
      setNearbyCount(null);
    }
  }, [api, selectedDate, deviceLocation]);

  const loadFacilities = useCallback(async () => {
    if (currentView.kind !== 'facilities' && currentView.kind !== 'nearby') {
      return;
    }
    const seq = ++requestSeq.current;
    setFacilityLoading(true);
    setFacilityError(null);
    const abort = new AbortController();
    try {
      if (currentView.kind === 'nearby') {
        if (!deviceLocation) {
          setFacilityData(null);
          setFacilityError(
            locationDenied
              ? '위치 권한이 필요합니다. 설정에서 위치 권한을 허용해 주세요.'
              : '위치를 확인하는 중입니다.',
          );
          return;
        }
        const res = await fetchFacilityJoins(
          api,
          {
            date: selectedDate,
            joinability: 'JOINABLE',
            regionMode: 'NEARBY',
            lat: deviceLocation.latitude,
            lng: deviceLocation.longitude,
            radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
            sort: 'DISTANCE',
          },
          abort.signal,
        );
        if (seq !== requestSeq.current) return;
        setFacilityData({
          facilities: res.facilities,
          totalJoinCount: res.totalJoinCount,
          regionLabel: `5km 이내 · ${selectedDate}`,
        });
        return;
      }

      const res = await fetchFacilityJoins(
        api,
        {
          date: selectedDate,
          joinability: 'JOINABLE',
          regionMode: 'DISTRICT',
          sido: currentView.sido!,
          sigungu: currentView.sigungu!,
          sort: 'TIME',
        },
        abort.signal,
      );
      if (seq !== requestSeq.current) return;
      setFacilityData({
        facilities: res.facilities,
        totalJoinCount: res.totalJoinCount,
        regionLabel: res.regionLabel,
      });
    } catch {
      if (seq !== requestSeq.current) return;
      setFacilityData(null);
      setFacilityError('골프장 목록을 불러오지 못했습니다.');
    } finally {
      if (seq === requestSeq.current) setFacilityLoading(false);
    }
  }, [api, selectedDate, currentView, deviceLocation, locationDenied]);

  useEffect(() => {
    if (currentView.kind === 'root' || currentView.kind === 'regions') {
      void loadSummary();
    }
  }, [loadSummary, currentView.kind]);

  useEffect(() => {
    if (currentView.kind === 'root') {
      void loadNearbyCount();
    }
  }, [loadNearbyCount, currentView.kind]);

  useEffect(() => {
    if (currentView.kind === 'facilities' || currentView.kind === 'nearby') {
      void loadFacilities();
    }
  }, [loadFacilities, currentView.kind]);

  const requestNearbyLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationDenied(true);
      setDeviceLocation(null);
      return false;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setDeviceLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      setLocationDenied(false);
      return true;
    } catch {
      setLocationDenied(true);
      return false;
    }
  }, []);

  const handleNearbyPress = useCallback(async () => {
    if (!deviceLocation) {
      const ok = await requestNearbyLocation();
      if (!ok) {
        setViewStack((prev) => [...prev, { kind: 'nearby' }]);
        return;
      }
    }
    setViewStack((prev) => [...prev, { kind: 'nearby' }]);
  }, [deviceLocation, requestNearbyLocation]);

  const handleRegionSelect = useCallback(
    (item: DiscoverRegionSummaryItemDto) => {
      if (item.hasChildren) {
        setViewStack((prev) => [
          ...prev,
          {
            kind: 'regions',
            sido: item.sido,
            sigungu: item.sigungu,
            title: item.label,
          },
        ]);
        return;
      }
      setViewStack((prev) => [
        ...prev,
        {
          kind: 'facilities',
          title: item.label,
          regionMode: 'DISTRICT',
          sido: item.sido,
          sigungu: item.sigungu!,
        },
      ]);
    },
    [],
  );

  const handleSummarySelectFromRegions = useCallback(
    (item: DiscoverRegionSummaryItemDto) => {
      const hasChildren =
        item.hasChildren ||
        (item.sigungu != null &&
          regionExploreHasChildren(item.sido, item.sigungu));
      if (hasChildren && currentView.kind === 'regions') {
        setViewStack((prev) => [
          ...prev,
          {
            kind: 'regions',
            sido: item.sido,
            sigungu: item.sigungu,
            title: item.label,
          },
        ]);
        return;
      }
      handleRegionSelect(item);
    },
    [currentView.kind, handleRegionSelect],
  );

  const handleFacilitySelect = useCallback(
    (facility: DiscoverFacilityJoinItemDto) => {
      setViewStack((prev) => [
        ...prev,
        {
          kind: 'joins',
          venueId: facility.venueId,
          venueName: facility.venueName,
          sido: facility.sido ?? '서울특별시',
          sigungu: facility.sigungu ?? '강남구',
          title: facility.venueName,
        },
      ]);
    },
    [],
  );

  const showBack = viewStack.length > 1;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.surface.base }]}
      edges={['top']}
    >
      <View style={styles.header}>
        {showBack ? (
          <Pressable
            onPress={popView}
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            hitSlop={8}
            style={styles.backBtn}
          >
            <Text variant="meta" style={{ color: gold }}>
              {'\u2039'} 뒤로
            </Text>
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.headerCenter}>
          <Text variant="sectionTitle" tone="primary">
            {headerTitle}
          </Text>
          {breadcrumbs.length > 1 ? (
            <Text variant="meta" tone="tertiary" numberOfLines={1}>
              {breadcrumbs.map((b) => b.label).join(' > ')}
            </Text>
          ) : null}
        </View>
        <View style={styles.backBtn} />
      </View>

      <RegionDateSelector
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <View style={styles.body}>
        {currentView.kind === 'root' ? (
          <RegionSummaryList
            items={summaryItems}
            loading={summaryLoading}
            error={summaryError}
            onRetry={() => void loadSummary()}
            onSelect={handleRegionSelect}
            leadingItem={{
              key: 'NEARBY',
              label: '내 위치',
              count: nearbyCount ?? undefined,
              onPress: () => void handleNearbyPress(),
            }}
          />
        ) : null}

        {currentView.kind === 'regions' ? (
          <RegionSummaryList
            items={summaryItems}
            loading={summaryLoading}
            error={summaryError}
            onRetry={() => void loadSummary()}
            onSelect={handleSummarySelectFromRegions}
          />
        ) : null}

        {currentView.kind === 'nearby' || currentView.kind === 'facilities' ? (
          <RegionFacilityList
            facilities={facilityData?.facilities ?? []}
            totalJoinCount={facilityData?.totalJoinCount ?? 0}
            regionLabel={facilityData?.regionLabel ?? headerTitle}
            loading={facilityLoading}
            error={facilityError}
            onRetry={() => void loadFacilities()}
            onSelectFacility={handleFacilitySelect}
            onSwitchToMap={onSwitchToMap}
          />
        ) : null}

        {currentView.kind === 'joins' ? (
          <RegionJoinListPanel
            date={selectedDate}
            venueId={currentView.venueId}
            venueName={currentView.venueName}
            sido={currentView.sido}
            sigungu={currentView.sigungu}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 64,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  body: {
    flex: 1,
  },
});
