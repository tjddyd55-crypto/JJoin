import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppBar, EmptyState, ScrollScreenFrame } from '@jjoin/design-system';
import type { MallOrderListItemDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { mallColors, mallMetrics } from '../mallDesignTokens';
import { formatMallCoinKo } from '../mallFormat';

export function JoinMallOrdersScreen() {
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
          <ActivityIndicator color={mallColors.accentGreen} />
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
            <View key={order.id} style={styles.row}>
              {order.coverImageUrl ? (
                <Image source={{ uri: order.coverImageUrl }} style={styles.thumb} />
              ) : (
                <View style={styles.thumb} />
              )}
              <View style={styles.copy}>
                <RNText style={styles.name} numberOfLines={2}>{order.productName}</RNText>
                <RNText style={styles.date}>
                  {new Date(order.createdAt).toLocaleString('ko-KR')}
                </RNText>
                <RNText style={styles.price}>{formatMallCoinKo(order.coinPrice)}</RNText>
              </View>
            </View>
          ))}
        </ScrollScreenFrame>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mallColors.canvas },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { gap: mallMetrics.gridRowGap, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginHorizontal: mallMetrics.screenPadding,
    borderRadius: mallMetrics.productCardRadius,
    borderWidth: 1,
    borderColor: mallColors.border,
    backgroundColor: mallColors.surface,
    padding: mallMetrics.detailInfoPadding,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: mallColors.surfaceMuted,
  },
  copy: { flex: 1, gap: 6 },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: mallColors.textPrimary,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: mallColors.textSecondary,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: mallColors.accentGreen,
  },
});
