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
import { MallProductContentBlocks } from '../components/MallProductContentBlocks';
import { MallProductPolicySection } from '../components/MallProductPolicySection';
import { MallSectionDivider } from '../components/MallSectionDivider';
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
  const hasContentBlocks = (product.contentBlocks?.length ?? 0) > 0;
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

        <View style={styles.productMeta}>
          {product.badge ? <RNText style={styles.badge}>{product.badge}</RNText> : null}
          <RNText style={styles.title}>{product.name}</RNText>
          {product.shortDescription ? (
            <RNText style={styles.summary}>{product.shortDescription}</RNText>
          ) : null}
          <RNText style={styles.price}>{formatMallCoinKo(product.coinPrice)}</RNText>
          <RNText style={styles.balance}>
            보유 코인 {formatNumber(product.availableCoin)}
          </RNText>
        </View>

        <MallSectionDivider spacing={22} />

        <View style={styles.section}>
          <RNText style={styles.sectionHeading}>상품 설명</RNText>
          {hasContentBlocks ? (
            <MallProductContentBlocks blocks={product.contentBlocks ?? []} />
          ) : (
            <>
              {product.description ? (
                <Text variant="body" tone="secondary" style={styles.bodyText}>
                  {product.description}
                </Text>
              ) : null}
              {gallery.slice(1).map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.detailImage} resizeMode="cover" />
              ))}
            </>
          )}
        </View>

        {product.exchangeGuide ? (
          <View style={[styles.section, styles.exchangeSection]}>
            <RNText style={styles.sectionHeading}>교환 · 수령 안내</RNText>
            <Text variant="body" tone="secondary" style={styles.bodyText}>
              {product.exchangeGuide}
            </Text>
          </View>
        ) : null}

        <MallProductPolicySection product={product} />
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
  productMeta: {
    paddingHorizontal: mallMetrics.screenPadding,
    paddingTop: 16,
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
    marginTop: -2,
    fontSize: 14,
    color: mallColors.textSecondary,
    lineHeight: 20,
  },
  price: {
    marginTop: 4,
    fontSize: mallMetrics.detailPriceSize,
    fontWeight: '700',
    color: mallColors.accentGreen,
    lineHeight: 30,
  },
  balance: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
    color: mallColors.textSecondary,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: mallMetrics.screenPadding,
    gap: 12,
  },
  exchangeSection: {
    marginTop: 24,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: mallColors.textPrimary,
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailImage: {
    width: '100%',
    aspectRatio: 1.2,
    marginVertical: 16,
    borderRadius: 14,
    backgroundColor: mallColors.surfaceMuted,
  },
});
