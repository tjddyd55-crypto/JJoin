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
  UserAvatar,
  Row,
} from '@jjoin/design-system';
import type { PlayedTogetherPersonDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

function profileHref(userId: string): Href {
  return { pathname: '/user/[userId]', params: { userId } } as Href;
}

export default function PlayedTogetherScreen() {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<PlayedTogetherPersonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listPlayedTogether());
    } catch {
      setError('함께 친 사람을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="caption" tone="secondary">
        완료된 조인에서 함께한 사람들입니다.
      </Text>
      <Spacer size="md" />
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
          아직 함께 친 사람이 없습니다.
        </Text>
      ) : null}
      <Stack gap="sm">
        {items.map((person) => {
          const last = new Date(person.lastPlayedAt).toLocaleDateString('ko-KR', {
            timeZone: 'Asia/Seoul',
          });
          return (
            <Pressable
              key={person.userId}
              accessibilityRole="button"
              onPress={() => router.push(profileHref(person.userId))}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
            >
              <Card variant="interactive" padding="md" style={styles.card}>
                <Row gap="md" align="center">
                  <UserAvatar
                    uri={person.avatarUrl}
                    name={person.nickname}
                    size="md"
                  />
                  <Stack gap="xxs" style={styles.meta}>
                    <Text variant="bodyStrong" tone="primary">
                      {person.nickname}
                      {person.verifiedBadge ? ' · 인증' : ''}
                    </Text>
                    {person.regionLabel ? (
                      <Text variant="caption" tone="secondary">
                        {person.regionLabel}
                      </Text>
                    ) : null}
                    <Text variant="caption" tone="tertiary">
                      함께 {person.playedCount}회 · 최근 {last}
                    </Text>
                    {person.attendanceRatePercent != null ? (
                      <Badge
                        label={`참석률 ${person.attendanceRatePercent}%`}
                        variant="gold"
                      />
                    ) : null}
                  </Stack>
                </Row>
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
  meta: { flex: 1 },
});
