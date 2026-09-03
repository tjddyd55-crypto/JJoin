import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  Button,
  Card,
  Row,
  ScrollScreenFrame,
  Spacer,
  Stack,
  Text,
  UserAvatar,
} from '@jjoin/design-system';
import type { PlayedTogetherPersonDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';
import { StarRatingDisplay } from '../../src/ui/patterns/StarRating';

function profileHref(userId: string): Href {
  return { pathname: '/user/[userId]', params: { userId } } as Href;
}

function reinviteHref(person: PlayedTogetherPersonDto): Href {
  return {
    pathname: '/(tabs)/create',
    params: {
      inviteeUserId: person.userId,
      inviteeNickname: person.nickname,
    },
  } as Href;
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
        완료된 조인에서 함께 플레이한 사람들입니다.
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
        <Stack gap="xs">
          <Text variant="body" tone="secondary">
            아직 함께 플레이한 사람이 없어요.
          </Text>
          <Text variant="caption" tone="tertiary">
            조인에 참가하면 함께 플레이한 사람이 여기에 쌓입니다.
          </Text>
        </Stack>
      ) : null}
      <Stack gap="sm">
        {items.map((person) => {
          const last = new Date(person.lastPlayedAt).toLocaleDateString('ko-KR', {
            timeZone: 'Asia/Seoul',
          });
          const ratingLine =
            person.reviewCount > 0 && person.averageRatingDisplay
              ? `★ ${person.averageRatingDisplay} · 후기 ${person.reviewCount}`
              : '아직 받은 평가가 없습니다';
          return (
            <Card key={person.userId} variant="interactive" padding="md" style={styles.card}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(profileHref(person.userId))}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <Row gap="md" align="center">
                  <UserAvatar uri={person.avatarUrl} name={person.nickname} size="md" />
                  <Stack gap="xxs" style={styles.meta}>
                    <Text variant="bodyStrong" tone="primary">
                      {person.nickname}
                      {person.verifiedBadge ? ' · 인증' : ''}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {ratingLine}
                    </Text>
                    {person.reviewCount > 0 && person.averageRating != null ? (
                      <StarRatingDisplay rating={person.averageRating} />
                    ) : null}
                    <Text variant="caption" tone="tertiary">
                      함께 {person.playedCount}회 · 마지막 플레이 {last}
                    </Text>
                  </Stack>
                </Row>
              </Pressable>
              <Spacer size="sm" />
              <Row gap="sm">
                <View style={styles.action}>
                  <Button
                    label="프로필"
                    variant="secondary"
                    onPress={() => router.push(profileHref(person.userId))}
                  />
                </View>
                <View style={styles.action}>
                  <Button
                    label="다시 초대"
                    onPress={() => router.push(reinviteHref(person))}
                  />
                </View>
              </Row>
            </Card>
          );
        })}
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  meta: { flex: 1 },
  action: { flex: 1 },
});
