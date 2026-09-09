import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { AppBar, EmptyState, useStickyActionInsets } from '@jjoin/design-system';
import { formatNumber } from '@jjoin/domain';
import type { MallProductDetailDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { MallStickyPurchaseBar } from '../components/MallStickyPurchaseBar';
import { mallColors, mallMetrics } from '../mallDesignTokens';
import { formatMallCoinKo } from '../mallFormat';

function balanceAfter(product: MallProductDetailDto): string {
  const price = Number(product.coinPrice);
  const balance = Number(product.availableCoin);
  if (!Number.isFinite(price) || !Number.isFinite(balance)) return '—';
  return formatNumber(balance - price);
}

export function JoinMallPurchaseConfirmScreen() {
  const router = useRouter();
  const { scrollPadding } = useStickyActionInsets({ buttonHeight: mallMetrics.ctaHeight });
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<MallProductDetailDto | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    try {
      setError(null);
      const res = await api.getMallProduct(productId);
      setProduct(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [api, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onPurchase = async () => {
    if (!product || product.purchaseState !== 'available') return;
    setBusy(true);
    try {
      await api.purchaseMallProduct(product.id);
      router.replace('/mall/orders' as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'purchase_failed');
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppBar title="구매 확인" showBack onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={mallColors.accentGreen} />
        </View>
      </View>
    );
  }

  if (!product || error) {
    return (
      <View style={styles.screen}>
        <AppBar title="구매 확인" showBack onBack={() => router.back()} />
        <EmptyState title="구매 정보를 불러오지 못했습니다" description={error ?? 'unknown'} />
      </View>
    );
  }

  const insufficient = product.purchaseState === 'insufficient_coin';
  const afterBalance = balanceAfter(product);
  const ctaLabel = busy
    ? '처리 중…'
    : insufficient
      ? '코인 충전하기'
      : '코인으로 구매';

  const onPressCta = () => {
    if (insufficient) {
      router.push('/my/coin-charge' as Href);
      return;
    }
    void onPurchase();
  };

  return (
    <View style={styles.screen}>
      <AppBar title="구매 확인" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            {product.coverImageUrl ? (
              <Image source={{ uri: product.coverImageUrl }} style={styles.thumb} />
            ) : (
              <View style={styles.thumb} />
            )}
            <View style={styles.summaryCopy}>
              <RNText style={styles.productName}>{product.name}</RNText>
              <RNText style={styles.productPrice}>{formatMallCoinKo(product.coinPrice)}</RNText>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <RNText style={styles.summaryLabel}>보유 코인</RNText>
            <RNText style={styles.summaryValue}>{formatNumber(product.availableCoin)}</RNText>
          </View>
          <View style={styles.summaryRow}>
            <RNText style={styles.summaryLabel}>결제 후 잔액</RNText>
            <RNText style={[styles.summaryValue, insufficient ? styles.negative : undefined]}>
              {insufficient ? afterBalance : formatNumber(product.remainingCoinAfterPurchase ?? afterBalance)}
            </RNText>
          </View>
        </View>

        {insufficient ? (
          <View style={styles.notice}>
            <RNText style={styles.noticeTitle}>코인이 부족합니다</RNText>
            <RNText style={styles.noticeBody}>먼저 코인을 충전한 뒤 구매를 진행해주세요.</RNText>
          </View>
        ) : null}
      </ScrollView>

      <MallStickyPurchaseBar
        buttonLabel={ctaLabel}
        disabled={busy}
        loading={busy}
        onPress={onPressCta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mallColors.canvas },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: {
    paddingHorizontal: mallMetrics.screenPadding,
    paddingTop: 28,
    gap: 20,
  },
  summaryCard: {
    borderRadius: mallMetrics.detailInfoRadius,
    borderWidth: 1,
    borderColor: mallColors.border,
    backgroundColor: mallColors.surface,
    padding: mallMetrics.detailInfoPadding,
    gap: 16,
  },
  summaryTop: { flexDirection: 'row', gap: 16 },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: mallColors.surfaceMuted,
  },
  summaryCopy: { flex: 1, gap: 8, paddingTop: 4 },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: mallColors.textPrimary,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: mallColors.accentGreen,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: mallColors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: mallColors.textPrimary,
  },
  negative: { color: mallColors.danger },
  notice: {
    borderRadius: 16,
    backgroundColor: mallColors.accentGreenSoft,
    padding: 16,
    gap: 16,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: mallColors.accentGreen,
  },
  noticeBody: {
    fontSize: 13,
    color: mallColors.textPrimary,
    lineHeight: 18,
  },
});
