import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  Text,
  Spacer,
  Stack,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { DEFAULT_NEARBY_RADIUS_METERS, localDayKey } from '@jjoin/domain';
import type { DiscoverJoinsResponse } from '@jjoin/types';
import { getSecureSessionStore } from '../../../../session/SessionContext';
import { getApiClient } from '../../../../lib/api';
import { useJoinDiscovery } from '../JoinDiscoveryContext';
import { fetchDiscoverJoins } from '../api/join-discover-api';
import { DiscoverJoinCard } from './DiscoverJoinCard';
import { CompactTextAction } from './CompactTextAction';

const FAB_SIZE = 56;
const FAB_CLEARANCE = FAB_SIZE + spacing.md + spacing.sm;

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

type FilterChip = {
  id: string;
  label: string;
  onPress: () => void;
  selected: boolean;
};

type Props = {
  locationDenied: boolean;
  deviceLocation: { latitude: number; longitude: number } | null;
};

export function DiscoverListPanel({ locationDenied, deviceLocation }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const { filter, setDate, patchFilter } = useJoinDiscovery();
  const [data, setData] = useState<DiscoverJoinsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    try {
      if (filter.region.mode === 'NEARBY' && !deviceLocation) {
        if (seq === requestSeq.current) {
          setData(null);
          setError(locationDenied ? '위치 권한이 없어 내 주변 조인을 불러올 수 없습니다. 지역을 선택해 주세요.' : '위치를 확인하는 중입니다.');
          setLoading(false);
        }
        return () => abort.abort();
      }

      const regionQuery =
        filter.region.mode === 'NEARBY'
          ? {
              regionMode: 'NEARBY' as const,
              lat: deviceLocation!.latitude,
              lng: deviceLocation!.longitude,
              radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
            }
          : {
              regionMode: 'DISTRICT' as const,
              sido: filter.region.sido,
              sigungu: filter.region.sigungu,
              lat: deviceLocation?.latitude,
              lng: deviceLocation?.longitude,
            };

      const list = await fetchDiscoverJoins(
        api,
        {
          date: filter.date,
          sort: filter.sort,
          joinability: filter.joinability,
          ...regionQuery,
        },
        abort.signal,
      );

      if (seq !== requestSeq.current) return () => abort.abort();
      setData(list);
    } catch (e) {
      if (seq !== requestSeq.current) return () => abort.abort();
      if ((e as Error)?.name === 'AbortError') return () => abort.abort();
      setData(null);
      setError('조인을 불러오지 못했습니다.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
    return () => abort.abort();
  }, [api, filter, deviceLocation, locationDenied]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void (async () => {
      cleanup = await load();
    })();
    return () => cleanup?.();
  }, [load]);

  const todayKey = localDayKey(new Date());
  const sectionTitle =
    filter.date === todayKey ? '오늘 참여 가능한 조인' : '선택한 날 조인';
  const empty = !loading && !error && (data?.totalCount ?? 0) === 0;
  const listBottomPad = FAB_CLEARANCE;

  const filterChips: FilterChip[] = [
    {
      id: 'ALL',
      label: '전체',
      selected: filter.joinability === 'ALL',
      onPress: () => patchFilter({ joinability: 'ALL' }),
    },
    {
      id: 'TIME',
      label: '시간순',
      selected: filter.sort === 'TIME',
      onPress: () => patchFilter({ sort: 'TIME' }),
    },
    {
      id: 'DISTANCE',
      label: '거리순',
      selected: filter.sort === 'DISTANCE',
      onPress: () => patchFilter({ sort: 'DISTANCE' }),
    },
    {
      id: 'MAP',
      label: '지도에서 보기',
      selected: false,
      onPress: () => patchFilter({ view: 'MAP' }),
    },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.filterRow}>
        {filterChips.map((chip) => (
          <Pressable
            key={chip.id}
            onPress={chip.onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: chip.selected }}
            style={[
              styles.filterChip,
              chip.selected
                ? {
                    backgroundColor: theme.colors.action.primary,
                    borderColor: theme.colors.action.primary,
                  }
                : {
                    backgroundColor: theme.colors.surface.card,
                    borderColor: theme.colors.border.subtle,
                  },
            ]}
          >
            <Text
              variant="joinFilterChip"
              tone={chip.selected ? 'onPrimary' : 'secondary'}
            >
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: listBottomPad }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} />
        }
      >
        {loading && !data ? <ActivityIndicator color={theme.colors.action.primary} /> : null}
        {error ? (
          <Text variant="joinMeta" tone="tertiary">
            {error}
          </Text>
        ) : null}
        {empty ? (
          <Stack gap="sm" style={styles.emptyBlock}>
            <Text variant="joinMeta" tone="secondary">
              선택한 날짜로 지역에 조인이 없습니다.
            </Text>
            <View style={styles.emptyActions}>
              {filter.date !== todayKey ? (
                <CompactTextAction
                  label="오늘로 이동"
                  onPress={() => setDate(todayKey)}
                />
              ) : null}
              <CompactTextAction
                label="지도에서 보기"
                onPress={() => patchFilter({ view: 'MAP' })}
              />
            </View>
          </Stack>
        ) : null}

        {(data?.ongoing.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <Text variant="joinSectionTitle" tone="primary">
              지금 진행 중
            </Text>
            <Stack gap="sm">
              {data!.ongoing.map((join) => (
                <DiscoverJoinCard
                  key={join.joinId}
                  join={join}
                  onPress={() => router.push(joinDetailHref(join.joinId))}
                />
              ))}
            </Stack>
          </View>
        ) : null}

        {(data?.upcoming.length ?? 0) > 0 ? (
          <>
            <Spacer size="sm" />
            <View style={styles.section}>
              <Text variant="joinSectionTitle" tone="primary">
                {sectionTitle}
              </Text>
              <Stack gap="sm">
                {data!.upcoming.map((join) => (
                  <DiscoverJoinCard
                    key={join.joinId}
                    join={join}
                    onPress={() => router.push(joinDetailHref(join.joinId))}
                  />
                ))}
              </Stack>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  section: {
    gap: 10,
  },
  emptyBlock: {
    paddingTop: 4,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
