import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  JoinCard,
  ScrollScreenFrame,
  Section,
  Spacer,
  Stack,
  Text,
  Row,
  spacing,
} from '@jjoin/design-system';
import {
  resolveJoinDiscoveryBadge,
  resolveJoinDiscoveryKind,
} from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import type { JoinListItemDto, MyJoinsResponse } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import {
  matchingDisplayStatusLabel,
} from '../../src/features/store/matching-join-ui';
import { reopenJoinHref } from '../../src/features/engagement/reopen-join';
import { mapJoinListItemToJoinCardProps } from '../../src/ui/join-card-map';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

function chatHref(joinId: string): Href {
  return { pathname: '/join/[joinId]/chat', params: { joinId } } as Href;
}

function JoinRow({
  item,
  onPress,
  onReopen,
  onChat,
}: {
  item: JoinListItemDto;
  onPress: () => void;
  onReopen?: () => void;
  onChat?: () => void;
}) {
  const matchingLabel = matchingDisplayStatusLabel(item, item.myRole === 'HOST' ? 'host' : 'participant');
  const badge = matchingLabel
    ? { label: matchingLabel, kind: item.displayStatus === 'IN_PROGRESS' ? 'ongoing' : 'upcoming' }
    : resolveJoinDiscoveryBadge(item);
  const cardProps = mapJoinListItemToJoinCardProps(item, onPress, {
    statusBadge: badge.label,
  });

  return (
    <View style={styles.joinCardWrap}>
      <JoinCard {...cardProps} />
      {onChat || onReopen ? (
        <Row gap="md" align="center" style={styles.joinActions}>
          {onChat ? (
            <Pressable
              accessibilityRole="button"
              onPress={onChat}
              style={styles.reopenBtn}
            >
              <Text variant="caption" tone="primary">
                채팅
              </Text>
            </Pressable>
          ) : null}
          {onReopen ? (
            <Pressable
              accessibilityRole="button"
              onPress={onReopen}
              style={styles.reopenBtn}
            >
              <Text variant="caption" tone="primary">
                다시 모집
              </Text>
            </Pressable>
          ) : null}
        </Row>
      ) : null}
    </View>
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

  async function onReopen(joinId: string) {
    try {
      const prefill = await api.getJoinPrefill(joinId);
      router.push(reopenJoinHref(prefill));
    } catch {
      setError('다시 모집 정보를 불러오지 못했습니다.');
    }
  }

  return (
    <ScrollScreenFrame ref={scrollRef}>
      <Text variant="joinScreenTitle" tone="primary">
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
        <Section title="내가 만든 조인" titleVariant="joinSectionTitle">
          {(data?.hosted ?? []).length === 0 ? (
            <Text variant="caption" tone="tertiary">
              없음
            </Text>
          ) : (
            <Stack gap="sm">
              {hosted.active.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="joinMeta" tone="secondary">
                    진행·예정
                  </Text>
                  {hosted.active.map((item) => (
                    <JoinRow
                      key={item.joinId}
                      item={item}
                      onPress={() => router.push(joinDetailHref(item.joinId))}
                      onChat={
                        item.chatAvailable
                          ? () => router.push(chatHref(item.joinId))
                          : undefined
                      }
                    />
                  ))}
                </Stack>
              ) : null}
              {hosted.past.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="joinMeta" tone="secondary">
                    지난 조인
                  </Text>
                  {hosted.past.map((item) => (
                    <JoinRow
                      key={item.joinId}
                      item={item}
                      onPress={() => router.push(joinDetailHref(item.joinId))}
                      onChat={
                        item.chatAvailable
                          ? () => router.push(chatHref(item.joinId))
                          : undefined
                      }
                      onReopen={() => void onReopen(item.joinId)}
                    />
                  ))}
                </Stack>
              ) : null}
            </Stack>
          )}
        </Section>
      </View>

      <View onLayout={(e) => setParticipatingY(e.nativeEvent.layout.y)}>
        <Section title="내가 참가한 조인" titleVariant="joinSectionTitle">
          {(data?.participating ?? []).length === 0 ? (
            <Text variant="caption" tone="tertiary">
              없음
            </Text>
          ) : (
            <Stack gap="sm">
              {participating.active.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="joinMeta" tone="secondary">
                    진행·예정
                  </Text>
                  {participating.active.map((item) => (
                    <JoinRow
                      key={item.joinId}
                      item={item}
                      onPress={() => router.push(joinDetailHref(item.joinId))}
                      onChat={
                        item.chatAvailable
                          ? () => router.push(chatHref(item.joinId))
                          : undefined
                      }
                    />
                  ))}
                </Stack>
              ) : null}
              {participating.past.length > 0 ? (
                <Stack gap="xs">
                  <Text variant="joinMeta" tone="secondary">
                    지난 조인
                  </Text>
                  {participating.past.map((item) => (
                    <JoinRow
                      key={item.joinId}
                      item={item}
                      onPress={() => router.push(joinDetailHref(item.joinId))}
                      onChat={
                        item.chatAvailable
                          ? () => router.push(chatHref(item.joinId))
                          : undefined
                      }
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
  joinCardWrap: {
    gap: spacing.xs,
  },
  joinActions: {
    paddingHorizontal: spacing.xs,
  },
  reopenBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
});
