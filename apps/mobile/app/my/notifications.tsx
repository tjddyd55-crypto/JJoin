import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppText,
  ScreenContainer,
  Stack,
  colors,
  spacing,
} from '@jjoin/design-system';
import type { AppNotificationDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { resolvePushRoute } from '../../src/features/notifications/push-registration';

export default function NotificationsScreen() {
  const router = useRouter();
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
    <ScreenContainer>
      <Stack gap="md">
        <View style={styles.header}>
          <AppText variant="title">알림</AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void api.markAllNotificationsRead().then(load);
            }}
          >
            <AppText variant="caption" color="primary">
              모두 읽음
            </AppText>
          </Pressable>
        </View>
        {loading ? <AppText>불러오는 중…</AppText> : null}
        {error ? <AppText color="danger">{error}</AppText> : null}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.xxl }}
          ListEmptyComponent={
            !loading ? <AppText color="muted">아직 알림이 없습니다.</AppText> : null
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => void onPressItem(item)}
              style={[styles.row, !item.readAt && styles.unread]}
            >
              <AppText variant="bodyStrong">{item.title}</AppText>
              <AppText variant="body" color="muted">
                {item.body}
              </AppText>
              <AppText variant="caption" color="muted">
                {new Date(item.createdAt).toLocaleString('ko-KR')}
              </AppText>
            </Pressable>
          )}
        />
      </Stack>
    </ScreenContainer>
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
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xxs,
    backgroundColor: colors.surface,
  },
  unread: {
    borderColor: colors.primary,
  },
});
