import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Spacer, Stack, Text, spacing, useTheme } from '@jjoin/design-system';
import { buildDiscoverRegionApiQuery, localDayKey } from '@jjoin/domain';
import type { DiscoverJoinsResponse } from '@jjoin/types';
import { getSecureSessionStore } from '../../../../session/SessionContext';
import { getApiClient } from '../../../../lib/api';
import { DiscoverJoinCard } from '../../discovery/components/DiscoverJoinCard';
import { CompactTextAction } from '../../discovery/components/CompactTextAction';
import { fetchDiscoverJoins } from '../../discovery/api/join-discover-api';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

type Props = {
  date: string;
  regionMode: 'DISTRICT' | 'NEARBY';
  sido?: string;
  sigungu?: string;
  deviceLocation?: { latitude: number; longitude: number } | null;
  locationDenied?: boolean;
  bottomPadding?: number;
  onBrowseOtherRegions?: () => void;
};

export function RegionJoinListPanel({
  date,
  regionMode,
  sido,
  sigungu,
  deviceLocation,
  locationDenied = false,
  bottomPadding = spacing.xl,
  onBrowseOtherRegions,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
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
      const region =
        regionMode === 'NEARBY'
          ? { mode: 'NEARBY' as const, label: '내 주변' }
          : {
              mode: 'DISTRICT' as const,
              sido: sido!,
              sigungu: sigungu!,
              label: sigungu ?? '',
            };
      const regionQuery = buildDiscoverRegionApiQuery({
        region,
        deviceLocation,
      });
      if ('error' in regionQuery) {
        if (seq !== requestSeq.current) return;
        setData(null);
        setError(
          locationDenied
            ? '위치 권한이 없어 내 주변 조인을 불러올 수 없습니다.'
            : '위치를 확인하는 중입니다.',
        );
        return;
      }

      const list = await fetchDiscoverJoins(
        api,
        {
          date,
          joinability: 'JOINABLE',
          sort: regionMode === 'NEARBY' ? 'DISTANCE' : 'TIME',
          ...regionQuery,
        },
        abort.signal,
      );
      if (seq !== requestSeq.current) return;
      setData(list);
    } catch {
      if (seq !== requestSeq.current) return;
      setData(null);
      setError('조인을 불러오지 못했습니다.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [
    api,
    date,
    deviceLocation,
    locationDenied,
    regionMode,
    sido,
    sigungu,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.action.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="body" tone="secondary">
          {error}
        </Text>
        {onBrowseOtherRegions ? (
          <CompactTextAction
            label="다른 지역 보기"
            onPress={onBrowseOtherRegions}
          />
        ) : null}
      </View>
    );
  }

  const todayKey = localDayKey(new Date());
  const sectionTitle =
    date === todayKey ? '오늘 참여 가능한 조인' : '선택한 날 조인';
  const empty = !loading && (data?.totalCount ?? 0) === 0;

  return (
    <ScrollView
      contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void load()} />
      }
    >
      {(data?.totalCount ?? 0) > 0 ? (
        <Text variant="joinMeta" tone="secondary">
          총 조인 {data!.totalCount}개
        </Text>
      ) : null}

      {empty ? (
        <Stack gap="sm" style={styles.emptyBlock}>
          <Text variant="joinMeta" tone="secondary">
            이 지역에 조인이 없습니다.
          </Text>
          {onBrowseOtherRegions ? (
            <CompactTextAction
              label="다른 지역 보기"
              onPress={onBrowseOtherRegions}
            />
          ) : null}
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
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    gap: 10,
  },
  emptyBlock: {
    paddingTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
