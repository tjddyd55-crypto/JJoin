import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Badge,
  Button,
  Card,
  ScrollScreenFrame,
  Spacer,
  Stack,
  Text,
} from '@jjoin/design-system';
import type { GolfFacilityFollowDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

export default function FollowedStoresScreen() {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<GolfFacilityFollowDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listFacilityFollows());
    } catch {
      setError('팔로우한 매장을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUnfollow(facilityId: string) {
    setBusyId(facilityId);
    setError(null);
    try {
      await api.unfollowFacility(facilityId);
      await load();
    } catch {
      setError('팔로우 해제에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      {loading ? (
        <Text variant="body" tone="secondary">
          불러오는 중…
        </Text>
      ) : null}
      {error ? (
        <Text variant="body" tone="error">
          {error}
        </Text>
      ) : null}
      {!loading && items.length === 0 ? (
        <Text variant="body" tone="secondary">
          팔로우한 매장이 없습니다.
        </Text>
      ) : null}
      <Stack gap="sm">
        {items.map((item) => {
          const region = [item.sido, item.sigungu].filter(Boolean).join(' ');
          return (
            <Card key={item.id} variant="base" padding="md" style={styles.card}>
              <Stack gap="sm">
                <Text variant="bodyStrong" tone="primary">
                  {item.displayName}
                </Text>
                {region ? (
                  <Text variant="caption" tone="secondary">
                    {region}
                  </Text>
                ) : null}
                <Stack gap="xs">
                  {item.todayJoinableCount > 0 ? (
                    <Badge
                      label={`오늘 ${item.todayJoinableCount}개 모집 중`}
                      variant="gold"
                    />
                  ) : (
                    <Text variant="caption" tone="tertiary">
                      오늘 모집 중인 조인 없음
                    </Text>
                  )}
                  <Text variant="caption" tone="secondary">
                    이번 주 모집 {item.weekJoinableCount}개
                  </Text>
                </Stack>
                <Button
                  label="팔로우 해제"
                  variant="secondary"
                  loading={busyId === item.golfFacilityId}
                  onPress={() => void onUnfollow(item.golfFacilityId)}
                />
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
});
