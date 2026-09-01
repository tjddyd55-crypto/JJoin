import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  Button,
  Card,
  ScrollScreenFrame,
  Stack,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { clubActivityTypeLabel, clubAgeGroupLabel } from '@jjoin/domain';
import type { ClubSummaryDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

export function ClubRootScreen() {
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<ClubSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listMyClubs();
      setItems(res.items);
    } catch {
      setError('동호회 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Stack gap="md">
        <View style={styles.actions}>
          <Button
            label="동호회 찾기"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/my/clubs/discover' as Href)}
          />
          <Button
            label="동호회 만들기"
            size="sm"
            onPress={() => router.push('/my/clubs/create' as Href)}
          />
        </View>

        {loading ? <Text tone="secondary">불러오는 중…</Text> : null}
        {error ? <Text tone="error">{error}</Text> : null}

        {!loading && !items.length ? (
          <Card padding="md">
            <Stack gap="sm">
              <Text tone="secondary">아직 가입한 동호회가 없습니다.</Text>
              <Text variant="caption" tone="tertiary">
                동호회 찾기에서 가입하거나 새 동호회를 만들어 보세요.
              </Text>
            </Stack>
          </Card>
        ) : null}

        {items.map((club) => (
          <Pressable
            key={club.id}
            onPress={() => router.push(`/my/clubs/${club.id}` as Href)}
          >
            <Card variant="interactive" padding="md">
              <Stack gap="xs">
                <Text variant="bodyStrong">{club.name}</Text>
                <Text variant="caption" tone="secondary">
                  {club.region} · {clubActivityTypeLabel(club.activityType)} · 회원 {club.memberCount}명
                </Text>
                {club.primaryAgeGroup ? (
                  <Text variant="caption" tone="tertiary">
                    주요 연령대 {clubAgeGroupLabel(club.primaryAgeGroup)}
                  </Text>
                ) : null}
                {club.myStatus === 'PENDING' ? (
                  <Text variant="caption" style={{ color: theme.colors.action.primary }}>
                    가입 승인 대기 중
                  </Text>
                ) : null}
              </Stack>
            </Card>
          </Pressable>
        ))}
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
