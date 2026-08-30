import { StyleSheet, View } from 'react-native';
import { FlatList, Pressable } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ScrollScreenFrame,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import type { AppNotificationDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { resolvePushRoute } from '../../src/features/notifications/push-routing';

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const api = getApiClient(getSecureSessionStore());
  const [items, setItems] = useState<AppNotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listNotifications({ limit: 40 });
      setItems(res.items);
    } catch {
      setError('알림을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPressItem = async (item: AppNotificationDto) => {
    try {
      if (!item.readAt) await api.markNotificationRead(item.id);
    } catch {
      // still navigate
    }
    const target = resolvePushRoute(item.data as unknown as Record<string, unknown>);
    if (target.kind === 'join') {
      router.push(`/join/${target.joinId}`);
    }
  };

  return (
    <ScrollScreenFrame>
      <View style={styles.header}>
        <Text variant="screenTitle" tone="primary">
          알림
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void api.markAllNotificationsRead().then(load);
          }}
        >
          <Text variant="caption" tone="primary">
            모두 읽음
          </Text>
        </Pressable>
      </View>
      <Spacer size="md" />
      {loading ? <Text variant="body" tone="secondary">불러오는 중…</Text> : null}
      {error ? <Text variant="body" tone="error">{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        ListEmptyComponent={
          !loading ? (
            <Text variant="body" tone="secondary">
              아직 알림이 없습니다.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => void onPressItem(item)}
            style={[
              styles.row,
              {
                borderColor: item.readAt
                  ? theme.colors.border.subtle
                  : theme.colors.action.primary,
                backgroundColor: theme.colors.surface.card,
              },
            ]}
          >
            <Text variant="bodyStrong" tone="primary">
              {item.title}
            </Text>
            <Text variant="body" tone="secondary">
              {item.body}
            </Text>
            <Text variant="caption" tone="tertiary">
              {new Date(item.createdAt).toLocaleString('ko-KR')}
            </Text>
          </Pressable>
        )}
      />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
});
