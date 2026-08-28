import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import type { DiscoverJoinsResponse } from '@jjoin/types';
import { getSecureSessionStore } from '../../../../session/SessionContext';
import { getApiClient } from '../../../../lib/api';
import { DiscoverJoinCard } from '../../discovery/components/DiscoverJoinCard';
import { fetchDiscoverJoins } from '../../discovery/api/join-discover-api';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

type Props = {
  date: string;
  venueId: string;
  venueName: string;
  sido: string;
  sigungu: string;
};

export function RegionJoinListPanel({
  date,
  venueId,
  venueName,
  sido,
  sigungu,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
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
      const list = await fetchDiscoverJoins(
        api,
        {
          date,
          regionMode: 'DISTRICT',
          sido,
          sigungu,
          joinability: 'JOINABLE',
          sort: 'TIME',
        },
        abort.signal,
      );
      if (seq !== requestSeq.current) return;
      const filtered = {
        ...list,
        ongoing: list.ongoing.filter((j) => j.venueId === venueId),
        upcoming: list.upcoming.filter((j) => j.venueId === venueId),
      };
      filtered.totalCount =
        filtered.ongoing.length + filtered.upcoming.length;
      setData(filtered);
    } catch {
      if (seq !== requestSeq.current) return;
      setData(null);
      setError('조인을 불러오지 못했습니다.');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [api, date, sido, sigungu, venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={gold} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="body" tone="secondary">
          {error}
        </Text>
      </View>
    );
  }

  const joins = [...(data?.ongoing ?? []), ...(data?.upcoming ?? [])];

  return (
    <ScrollView
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void load()} />
      }
    >
      <Text variant="meta" tone="tertiary" style={styles.subtitle}>
        {venueName}
      </Text>
      {joins.length === 0 ? (
        <Text variant="body" tone="secondary">
          참가 가능한 조인이 없습니다.
        </Text>
      ) : (
        joins.map((join) => (
          <DiscoverJoinCard
            key={join.joinId}
            join={join}
            onPress={() => router.push(joinDetailHref(join.joinId))}
            onJoinPress={() => router.push(joinDetailHref(join.joinId))}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    paddingHorizontal: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
});
