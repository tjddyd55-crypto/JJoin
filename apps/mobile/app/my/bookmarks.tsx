import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  Badge,
  Card,
  ScrollScreenFrame,
  Spacer,
  Stack,
  Text,
} from '@jjoin/design-system';
import type { JoinBookmarkDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

export default function BookmarksScreen() {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<JoinBookmarkDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listJoinBookmarks());
    } catch {
      setError('찜한 조인을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

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
          찜한 조인이 없습니다.
        </Text>
      ) : null}
      <Stack gap="sm">
        {items.map((item) => {
          const start = new Date(item.join.startAt).toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
          });
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => router.push(joinDetailHref(item.joinId))}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <Card variant="interactive" padding="md" style={styles.card}>
                <Stack gap="xs">
                  <Text variant="bodyStrong" tone="primary">
                    {item.join.venueName}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {start}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {item.join.confirmedPlayerCount}/{item.join.plannedPlayerCount}명
                  </Text>
                  <Badge
                    label={String(item.join.displayStatusLabel ?? item.join.status)}
                    variant="neutral"
                  />
                </Stack>
              </Card>
            </Pressable>
          );
        })}
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
});
