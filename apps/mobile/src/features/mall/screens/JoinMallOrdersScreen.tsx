import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppBar,
  Card,
  EmptyState,
  ScrollScreenFrame,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { formatCoinWithLabel } from '@jjoin/domain';
import type { MallOrderListItemDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';

export function JoinMallOrdersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MallOrderListItemDto[]>([]);

  const load = useCallback(async () => {
    const res = await api.listMallOrders();
    setItems(res.items);
    setLoading(false);
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.screen}>
      <AppBar title="구매내역" showBack onBack={() => router.back()} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.action.primary} />
        </View>
      ) : items.length === 0 ? (
        <ScrollScreenFrame>
          <EmptyState
            title="구매내역이 없습니다"
            description="쪼인몰에서 코인으로 교환한 상품이 여기에 표시됩니다"
          />
        </ScrollScreenFrame>
      ) : (
        <ScrollScreenFrame contentContainerStyle={styles.list}>
          {items.map((order) => (
            <Card key={order.id} variant="elevated" padding="md" style={styles.row}>
              {order.coverImageUrl ? (
                <Image source={{ uri: order.coverImageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: theme.colors.surface.soft }]} />
              )}
              <View style={styles.copy}>
                <Text variant="bodyStrong" numberOfLines={2}>{order.productName}</Text>
                <Text variant="caption" tone="secondary">
                  {new Date(order.createdAt).toLocaleString('ko-KR')}
                </Text>
                <Text variant="coinMedium" tone="success">{formatCoinWithLabel(order.coinPrice)}</Text>
              </View>
            </Card>
          ))}
        </ScrollScreenFrame>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: 12 },
  copy: { flex: 1, gap: 4 },
});
