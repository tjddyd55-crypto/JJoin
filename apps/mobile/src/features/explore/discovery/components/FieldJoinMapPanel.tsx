import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Text, spacing } from '@jjoin/design-system';
import { buildDiscoverRegionApiQuery } from '@jjoin/domain';
import type { DiscoverJoinCardDto } from '@jjoin/types';
import { getApiClient } from '../../../../lib/api';
import { getSecureSessionStore } from '../../../../session/SessionContext';
import { useJoinDiscovery } from '../JoinDiscoveryContext';
import { fetchDiscoverJoins } from '../api/join-discover-api';
import { DiscoverJoinCard } from './DiscoverJoinCard';

type Props = {
  deviceLocation: { latitude: number; longitude: number } | null;
  locationDenied: boolean;
};

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

export function FieldJoinMapPanel({ deviceLocation, locationDenied }: Props) {
  const router = useRouter();
  const { filter } = useJoinDiscovery();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<DiscoverJoinCardDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const regionQuery = buildDiscoverRegionApiQuery({
        region: filter.region,
        deviceLocation,
      });
      if ('error' in regionQuery) {
        setItems([]);
        return;
      }
      const list = await fetchDiscoverJoins(api, {
        date: filter.date,
        sort: filter.sort,
        joinability: filter.joinability,
        venueType: 'FIELD',
        ...regionQuery,
      });
      setItems([...list.ongoing, ...list.upcoming].filter((row) => row.hasMapCoords));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, deviceLocation, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.fallback}>
        <Text variant="sectionTitle" tone="primary">지도에 표시할 좌표가 부족합니다</Text>
        <Text variant="caption" tone="secondary">
          {locationDenied
            ? '필드 골프장 공개데이터에 좌표가 없는 경우가 많습니다. 리스트나 지역별로 찾아 주세요.'
            : '좌표가 있는 필드 조인이 없습니다. 리스트에서 골프장명·지역으로 찾아 주세요.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      <Text variant="caption" tone="secondary">
        좌표가 확인된 필드 조인만 지도 대신 목록으로 보여 줍니다.
      </Text>
      {items.map((join) => (
        <DiscoverJoinCard
          key={join.joinId}
          join={join}
          onPress={() => router.push(joinDetailHref(join.joinId))}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallback: { padding: spacing.lg, gap: spacing.sm },
  list: { flex: 1, padding: spacing.md, gap: spacing.sm },
});
