import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  AppBar,
  EmptyState,
  STICKY_ACTION_SHORTAGE_ROW_EXTRA,
  Text,
  stickyActionScrollPaddingForButton,
} from '@jjoin/design-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatNumber } from '@jjoin/domain';
import type { MallProductDetailDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { MallStickyPurchaseBar } from '../components/MallStickyPurchaseBar';
import { mallColors, mallMetrics } from '../mallDesignTokens';
import { formatMallCoinKo } from '../mallFormat';

function shortageAmount(product: MallProductDetailDto): string | null {
  if (product.purchaseState !== 'insufficient_coin') return null;
  const price = Number(product.coinPrice);
  const balance = Number(product.availableCoin);
  if (!Number.isFinite(price) || !Number.isFinite(balance)) return null;
  const diff = price - balance;
  return diff > 0 ? String(diff) : null;
}

function bottomButtonLabel(state: MallProductDetailDto['purchaseState']): string {
  if (state === 'sold_out') return '품절';
  if (state === 'paused') return '판매중지';
  if (state === 'insufficient_coin') return '코인 충전 후 구매';
  if (state === 'unavailable') return '구매 불가';
  return '코인으로 구매';
}

export function JoinMallProductDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [loading, setLoading] = useState(true);
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

  const onPressCta = () => {
    if (!product || product.purchaseState !== 'available') return;
    router.push(`/mall/confirm?productId=${product.id}` as Href);
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppBar title="상품 상세" showBack onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={mallColors.accentGreen} />
        </View>
      </View>
    );
  }

  if (!product || error) {
    return (
      <View style={styles.screen}>
        <AppBar title="상품 상세" showBack onBack={() => router.back()} />
        <EmptyState title="상품을 불러오지 못했습니다" description={error ?? 'unknown'} />
      </View>
    );
  }

  const gallery = [
    ...(product.coverImageUrl ? [product.coverImageUrl] : []),
    ...product.images.map((image) => image.imageUrl).filter(Boolean),
  ];
  const shortage = shortageAmount(product);
  const scrollBottomPadding = stickyActionScrollPaddingForButton(
    insets.bottom,
    mallMetrics.ctaHeight,
    {
      extraContentHeight: shortage ? STICKY_ACTION_SHORTAGE_ROW_EXTRA : 0,
    },
  );

  return (
    <View style={styles.screen}>
      <AppBar title="상품 상세" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}>
        <View style={styles.hero}>
          {gallery[0] ? (
            <Image source={{ uri: gallery[0] }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroImage} />
          )}
        </View>

        <View style={styles.infoCard}>
          {product.badge ? <RNText style={styles.badge}>{product.badge}</RNText> : null}
          <RNText style={styles.title}>{product.name}</RNText>
          {product.shortDescription ? (
            <RNText style={styles.summary}>{product.shortDescription}</RNText>
          ) : null}
          <RNText style={styles.price}>{formatMallCoinKo(product.coinPrice)}</RNText>
          <RNText style={styles.balance}>
            내 보유 코인  {formatNumber(product.availableCoin)}
          </RNText>
        </View>

        <Pressable style={styles.sectionCard} accessibilityRole="button">
          <RNText style={styles.sectionTitle}>상품 정보</RNText>
          <RNText style={styles.sectionSubtitle}>사용 방법 · 유효기간 · 환불 정책</RNText>
          <RNText style={styles.sectionChevron}>›</RNText>
        </Pressable>

        {product.description ? (
          <View style={styles.detailBlock}>
            <Text variant="sectionTitle">상품 설명</Text>
            <Text variant="body" tone="secondary" style={styles.detailText}>{product.description}</Text>
          </View>
        ) : null}

        {product.exchangeGuide ? (
          <View style={styles.detailBlock}>
            <Text variant="sectionTitle">교환 · 수령 안내</Text>
            <Text variant="body" tone="secondary" style={styles.detailText}>{product.exchangeGuide}</Text>
          </View>
        ) : null}

        {gallery.slice(1).map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.detailImage} resizeMode="cover" />
        ))}
      </ScrollView>

      <MallStickyPurchaseBar
        shortageCoin={shortage}
        buttonLabel={bottomButtonLabel(product.purchaseState)}
        disabled={product.purchaseState !== 'available'}
        onPress={onPressCta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: mallColors.canvas },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: {},
  hero: { backgroundColor: mallColors.surfaceMuted },
  heroImage: {
    width: '100%',
    height: mallMetrics.detailHeroHeight,
    backgroundColor: mallColors.surfaceMuted,
  },
  infoCard: {
    marginHorizontal: mallMetrics.screenPadding,
    marginTop: 18,
    borderRadius: mallMetrics.detailInfoRadius,
    borderWidth: 1,
    borderColor: mallColors.border,
    backgroundColor: mallColors.surface,
    padding: mallMetrics.detailInfoPadding,
    gap: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    color: mallColors.accentGreen,
  },
  title: {
    fontSize: mallMetrics.detailTitleSize,
    fontWeight: '700',
    color: mallColors.textPrimary,
    lineHeight: 28,
  },
  summary: {
    fontSize: 13,
    color: mallColors.textSecondary,
    lineHeight: 18,
  },
  price: {
    marginTop: 8,
    fontSize: mallMetrics.detailPriceSize,
    fontWeight: '700',
    color: mallColors.accentGreen,
  },
  balance: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '500',
    color: mallColors.textPrimary,
  },
  sectionCard: {
    marginHorizontal: mallMetrics.screenPadding,
    marginTop: 16,
    minHeight: mallMetrics.detailSectionHeight,
    borderRadius: mallMetrics.detailSectionRadius,
    borderWidth: 1,
    borderColor: mallColors.border,
    backgroundColor: mallColors.surface,
    padding: mallMetrics.detailInfoPadding,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: mallColors.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 16,
    fontSize: 13,
    color: mallColors.textSecondary,
  },
  sectionChevron: {
    position: 'absolute',
    right: 16,
    top: 40,
    fontSize: 22,
    color: mallColors.textSecondary,
  },
  detailBlock: {
    marginHorizontal: mallMetrics.screenPadding,
    marginTop: 20,
    gap: 8,
  },
  detailText: { lineHeight: 22 },
  detailImage: {
    width: '100%',
    aspectRatio: 1.2,
    marginTop: 16,
    backgroundColor: mallColors.surfaceMuted,
  },
});
