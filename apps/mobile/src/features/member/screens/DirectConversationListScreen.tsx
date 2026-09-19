import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { ProfileAvatar, ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import type { DirectConversationDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  });
}

export function DirectConversationListScreen() {
  const router = useRouter();
  const { me } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<DirectConversationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const enabled = me?.messagePolicy?.enabled !== false;

  const load = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }
    try {
      const res = await api.listDirectConversations();
      setItems(res.items);
      setError(null);
    } catch {
      setError('메시지 목록을 불러오지 못했습니다.');
    }
  }, [api, enabled]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="caption" tone="secondary">
        1:1 메시지입니다. 조인 채팅과는 별도입니다.
      </Text>
      <Spacer size="md" />
      {!enabled ? (
        <Text variant="body" tone="secondary">
          회원 메시지가 비활성화되어 있습니다.
        </Text>
      ) : null}
      {error ? (
        <Text variant="body" tone="error">
          {error}
        </Text>
      ) : null}
      {enabled && items.length === 0 && !error ? (
        <Text variant="body" tone="secondary">
          아직 대화가 없습니다. 회원 카드에서 메시지를 보내보세요.
        </Text>
      ) : null}
      {items.map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          onPress={() => router.push(`/messages/${row.id}` as Href)}
          style={styles.row}
        >
          <ProfileAvatar imageUrl={row.peer.avatarUrl} name={row.peer.nickname} size="md" />
          <View style={styles.body}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {row.peer.nickname}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {row.lastMessagePreview ?? '대화를 시작해보세요'}
            </Text>
          </View>
          <View style={styles.meta}>
            <Text variant="caption" tone="tertiary">
              {formatTime(row.lastMessageAt)}
            </Text>
            {row.unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text variant="caption" tone="primary">
                  {row.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    minHeight: 64,
  },
  body: { flex: 1, gap: 2, minWidth: 0 },
  meta: { alignItems: 'flex-end', gap: 4 },
  badge: {
    minWidth: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,196,0,0.25)',
    alignItems: 'center',
  },
});
