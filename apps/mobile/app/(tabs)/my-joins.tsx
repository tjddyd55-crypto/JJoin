import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Badge,
  Card,
  ScrollScreenFrame,
  Section,
  Spacer,
  Stack,
  Text,
  Row,
} from '@jjoin/design-system';
import {
  resolveJoinDiscoveryBadge,
  resolveJoinDiscoveryKind,
} from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import type { JoinListItemDto, MyJoinsResponse } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

function JoinRow({ item, onPress }: { item: JoinListItemDto; onPress: () => void }) {
  const start = new Date(item.startAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const badge = resolveJoinDiscoveryBadge(item);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <Card variant="interactive" padding="md" style={styles.joinCard}>
        <Stack gap="xs">
          <Row justify="space-between" align="center">
            <Text variant="body" tone="primary" style={styles.title}>
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
            {item.confirmedPlayerCount}/{item.plannedPlayerCount}
            {item.myParticipationStatus ? ` · 나: ${item.myParticipationStatus}` : ''}
            {item.pendingApplicantCount > 0 ? ` · 신청 ${item.pendingApplicantCount}` : ''}
          </Text>
        </Stack>
      </Card>
    </Pressable>
  );
}

function splitActivePast(items: JoinListItemDto[]) {
  const active: JoinListItemDto[] = [];
  const past: JoinListItemDto[] = [];
  for (const item of items) {
    const kind = resolveJoinDiscoveryKind(item);
    if (kind === 'past' || kind === 'inactive') past.push(item);
    else active.push(item);
  }
  return { active, past };
}

export default function MyJoinsScreen() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [hostedY, setHostedY] = useState(0);
  const [participatingY, setParticipatingY] = useState(0);
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [data, setData] = useState<MyJoinsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.getMyJoins();
      setData(next);
      setError(null);
    } catch {
      setError('내 조인을 불러오지 못했습니다.');
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      if (section === 'hosted' && hostedY > 0) {
        scrollRef.current?.scrollTo({ y: hostedY, animated: true });
      } else if (section === 'participating' && participatingY > 0) {
        scrollRef.current?.scrollTo({ y: participatingY, animated: true });
      }
    }, [section, hostedY, participatingY]),
  );

  const hosted = splitActivePast(data?.hosted ?? []);
  const participating = splitActivePast(data?.participating ?? []);

  return (
    <ScrollScreenFrame ref={scrollRef}>
      <Text variant="screenTitle" tone="primary">
        {t('nav.myJoins')}
      </Text>
      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}

      <Spacer size="md" />

      <View onLayout={(e) => setHostedY(e.nativeEvent.layout.y)}>
        <Section title="내가 만든 조인">
          {(data?.hosted ?? []).length === 0 ? (
            <Text variant="caption" tone="tertiary">
              없음
            </Text>
          ) : (
            <Stack gap="md">
              {hosted.active.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="meta" tone="secondary">
                    진행·예정
                  </Text>
                  {hosted.active.map((item) => (
                    <JoinRow
                      key={item.joinId}
                      item={item}
                      onPress={() => router.push(joinDetailHref(item.joinId))}
                    />
                  ))}
                </Stack>
              ) : null}
              {hosted.past.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="meta" tone="secondary">
                    지난 조인
                  </Text>
                  {hosted.past.map((item) => (
                    <JoinRow
                      key={item.joinId}
                      item={item}
                      onPress={() => router.push(joinDetailHref(item.joinId))}
                    />
                  ))}
                </Stack>
              ) : null}
            </Stack>
          )}
        </Section>
      </View>

      <View onLayout={(e) => setParticipatingY(e.nativeEvent.layout.y)}>
        <Section title="내가 참가한 조인">
          {(data?.participating ?? []).length === 0 ? (
            <Text variant="caption" tone="tertiary">
              없음
            </Text>
          ) : (
            <Stack gap="md">
              {participating.active.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="meta" tone="secondary">
                    진행·예정
                  </Text>
                  {participating.active.map((item) => (
                    <JoinRow
                      key={item.joinId}
                      item={item}
                      onPress={() => router.push(joinDetailHref(item.joinId))}
                    />
                  ))}
                </Stack>
              ) : null}
              {participating.past.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="meta" tone="secondary">
                    지난 조인
                  </Text>
                  {participating.past.map((item) => (
                    <JoinRow
                      key={item.joinId}
                      item={item}
                      onPress={() => router.push(joinDetailHref(item.joinId))}
                    />
                  ))}
                </Stack>
              ) : null}
            </Stack>
          )}
        </Section>
      </View>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  joinCard: {
    marginBottom: 0,
  },
  title: { flex: 1, paddingRight: 8 },
});
