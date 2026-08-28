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
  Section,
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
  const gold = theme.colors.action.primary;

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
  const upcomingTitle =
    filter.date === todayKey ? '예정된 조인' : '선택한 날 조인';
  const empty = !loading && !error && (data?.totalCount ?? 0) === 0;
  const listBottomPad = FAB_CLEARANCE;

  return (
    <View style={styles.root}>
      <View style={styles.filterRow}>
        {(['ALL', 'JOINABLE'] as const).map((id) => {
          const selected = filter.joinability === id;
          return (
            <Pressable
              key={id}
              onPress={() => patchFilter({ joinability: id })}
              style={[
                styles.filterChip,
                {
                  borderColor: selected ? gold : theme.colors.border.subtle,
                },
              ]}
            >
              <Text
                variant="meta"
                style={selected ? { color: gold } : undefined}
              >
                {id === 'ALL' ? '전체' : '참가 가능'}
              </Text>
            </Pressable>
          );
        })}
        {(['TIME', 'DISTANCE'] as const).map((id) => {
          const selected = filter.sort === id;
          return (
            <Pressable
              key={id}
              onPress={() => patchFilter({ sort: id })}
              style={[
                styles.filterChip,
                {
                  borderColor: selected ? gold : theme.colors.border.subtle,
                },
              ]}
            >
              <Text
                variant="meta"
                style={selected ? { color: gold } : undefined}
              >
                {id === 'TIME' ? '시간순' : '거리순'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: listBottomPad }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} />
        }
      >
        {loading && !data ? <ActivityIndicator color={gold} /> : null}
        {error ? (
          <Text variant="meta" tone="tertiary">
            {error}
          </Text>
        ) : null}
        {empty ? (
          <Stack gap="sm">
            <Text variant="body" tone="secondary">
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
          <Section title="지금 진행 중">
            <Stack gap="md">
              {data!.ongoing.map((join) => (
                <DiscoverJoinCard
                  key={join.joinId}
                  join={join}
                  onPress={() => router.push(joinDetailHref(join.joinId))}
                  onJoinPress={() => router.push(joinDetailHref(join.joinId))}
                />
              ))}
            </Stack>
          </Section>
        ) : null}

        {(data?.upcoming.length ?? 0) > 0 ? (
          <>
            <Spacer size="md" />
            <Section title={upcomingTitle}>
              <Stack gap="md">
                {data!.upcoming.map((join) => (
                  <DiscoverJoinCard
                    key={join.joinId}
                    join={join}
                    onPress={() => router.push(joinDetailHref(join.joinId))}
                    onJoinPress={() => router.push(joinDetailHref(join.joinId))}
                  />
                ))}
              </Stack>
            </Section>
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
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
