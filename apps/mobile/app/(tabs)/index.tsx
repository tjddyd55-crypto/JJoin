import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import {
  Badge,
  Button,
  Text,
  IconButton,
  ScrollScreenFrame,
  Section,
  Spacer,
  Stack,
  Row,
  Card,
  useTheme,
} from '@jjoin/design-system';
import { pickHomeHostedJoins, resolveJoinDiscoveryBadge } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import type { JoinListItemDto, MyJoinsResponse } from '@jjoin/types';
import { useSession, getSecureSessionStore } from '../../src/session/SessionContext';
import { getApiClient } from '../../src/lib/api';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

export default function HomeScreen() {
  const { me } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const nickname = me?.publicProfile?.nickname;
  const available = me?.walletSummary.availableCoin ?? '—';
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [myJoins, setMyJoins] = useState<MyJoinsResponse | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const next = await api.getMyJoins();
          if (!cancelled) setMyJoins(next);
        } catch {
          if (!cancelled) setMyJoins(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [api]),
  );

  const hostedActive = useMemo(
    () => pickHomeHostedJoins(myJoins?.hosted ?? [], { limit: 2 }),
    [myJoins],
  );

  return (
    <ScrollScreenFrame>
      <Row justify="space-between" align="center">
        <View style={styles.greeting}>
          <Text variant="meta" tone="tertiary">
            {t('app.name')}
          </Text>
          <Text variant="screenTitle" tone="primary">
            {nickname ? `안녕하세요, ${nickname}님` : t('auth.login.title')}
          </Text>
        </View>
        <IconButton
          icon="notification"
          accessibilityLabel="알림"
          variant="surface"
          onPress={() => router.push('/my/notifications')}
        />
      </Row>

      <Spacer size="md" />

      <Section title="내 코인" subtitle="사용 가능 잔액">
        <View
          style={[
            styles.coinHero,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text variant="meta" tone="secondary">
            {t('wallet.available')}
          </Text>
          <Text variant="coinLarge" style={{ color: theme.colors.reward.primary }}>
            {available}
          </Text>
        </View>
      </Section>

      <Section title="내 진행 중 조인" subtitle="내가 만든 오늘·진행 조인">
        {hostedActive.length === 0 ? (
          <Stack gap="sm">
            <Text variant="meta" tone="tertiary">
              지금 진행 중인 조인이 없습니다.
            </Text>
            <Button label="조인 만들기" onPress={() => router.push('/(tabs)/create')} />
            <Button
              label="주변 탐색"
              variant="secondary"
              onPress={() => router.push('/(tabs)/explore')}
            />
          </Stack>
        ) : (
          <Stack gap="sm">
            {hostedActive.map((item) => (
              <HomeHostedJoinCard
                key={item.joinId}
                item={item}
                onPress={() => router.push(joinDetailHref(item.joinId))}
              />
            ))}
            <Button
              label="내 조인 전체 보기"
              variant="secondary"
              onPress={() => router.push('/(tabs)/my-joins')}
            />
          </Stack>
        )}
      </Section>

      <Section title="오늘 참여할 조인" subtitle="날짜·지역으로 주변 조인 찾기">
        <EmptyJoinHint message="오늘 어디서 조인할지 탐색에서 바로 확인해 보세요." />
        <Spacer size="sm" />
        <Button
          label="오늘 조인 전체보기"
          onPress={() => router.push('/(tabs)/explore')}
        />
      </Section>
    </ScrollScreenFrame>
  );
}

function HomeHostedJoinCard({
  item,
  onPress,
}: {
  item: JoinListItemDto;
  onPress: () => void;
}) {
  const badge = resolveJoinDiscoveryBadge(item);
  const start = new Date(item.startAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
    >
      <Card variant="interactive" padding="md">
        <Stack gap="xs">
          <Row justify="space-between" align="center">
            <Text variant="body" tone="primary" style={styles.cardTitle}>
              {item.venueName}
            </Text>
            <Badge
              label={badge.label}
              variant={badge.kind === 'ongoing' ? 'gold' : 'neutral'}
            />
          </Row>
          <Text variant="caption" tone="secondary">
            {start}
          </Text>
          <Text variant="caption" tone="tertiary">
            {item.confirmedPlayerCount}/{item.plannedPlayerCount}명
          </Text>
        </Stack>
      </Card>
    </Pressable>
  );
}

function EmptyJoinHint({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.empty,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text variant="meta" tone="tertiary">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { flex: 1, gap: 4, paddingRight: 12 },
  coinHero: {
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  empty: {
    padding: 16,
    borderWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, paddingRight: 8 },
});
