import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  AppBar,
  Badge,
  BottomActionBar,
  Button,
  Card,
  EmptyState,
  Spacer,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { formatCoinWithLabel } from '@jjoin/domain';
import type { MallProductDetailDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';

function ctaLabel(state: MallProductDetailDto['purchaseState']): string {
  if (state === 'sold_out') return '품절';
  if (state === 'paused') return '판매중지';
  if (state === 'insufficient_coin') return '코인 부족';
  if (state === 'unavailable') return '구매 불가';
  return '코인으로 구매';
}

export function JoinMallProductDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
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
      router.push('/mall/orders' as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'purchase_failed');
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <AppBar title="상품 상세" showBack onBack={() => router.back()} />
        <ActivityIndicator color={theme.colors.action.primary} />
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

  return (
    <View style={styles.screen}>
      <AppBar title="상품 상세" showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {gallery[0] ? (
            <Image source={{ uri: gallery[0] }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: theme.colors.surface.soft }]} />
          )}
          {product.badge ? (
            <View style={styles.badge}>
              <Badge label={product.badge} variant="success" />
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text variant="caption" tone="tertiary">{product.categoryName}</Text>
          <Text variant="display" style={styles.title}>{product.name}</Text>
          <Text variant="coinMedium" tone="success">{formatCoinWithLabel(product.coinPrice)}</Text>
          {product.shortDescription ? (
            <Text variant="body" tone="secondary" style={styles.summary}>{product.shortDescription}</Text>
          ) : null}
        </View>

        <Card variant="elevated" padding="md" style={styles.coinCard}>
          <Text variant="bodyStrong">내 보유 코인</Text>
          <Text variant="sectionTitle">{formatCoinWithLabel(product.availableCoin)}</Text>
          {product.remainingCoinAfterPurchase ? (
            <Text variant="caption" tone="secondary" style={styles.after}>
              구매 후 {formatCoinWithLabel(product.remainingCoinAfterPurchase)}
            </Text>
          ) : product.purchaseState === 'insufficient_coin' ? (
            <Text variant="caption" tone="error" style={styles.after}>
              코인이 부족합니다. 조인에 참여하고 보상 코인을 모아보세요.
            </Text>
          ) : null}
        </Card>

        {product.description ? (
          <View style={styles.section}>
            <Text variant="sectionTitle">상품 설명</Text>
            <Spacer size="xs" />
            <Text variant="body" tone="secondary">{product.description}</Text>
          </View>
        ) : null}

        {product.exchangeGuide ? (
          <View style={styles.section}>
            <Text variant="sectionTitle">교환 · 수령 안내</Text>
            <Spacer size="xs" />
            <Text variant="body" tone="secondary">{product.exchangeGuide}</Text>
          </View>
        ) : null}

        {gallery.slice(1).map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.detailImage} resizeMode="cover" />
        ))}
      </ScrollView>

      <BottomActionBar>
        <Button
          label={ctaLabel(product.purchaseState)}
          onPress={onPurchase}
          disabled={product.purchaseState !== 'available' || busy}
          loading={busy}
          fullWidth
        />
      </BottomActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
  content: { paddingBottom: 120 },
  hero: { position: 'relative' },
  heroImage: { width: '100%', aspectRatio: 1.1, backgroundColor: '#eef2f6' },
  badge: { position: 'absolute', top: spacing.md, left: spacing.md },
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, gap: 6 },
  title: { marginTop: 4 },
  summary: { marginTop: spacing.sm },
  coinCard: { marginHorizontal: spacing.md, marginTop: spacing.md, gap: 4 },
  after: { marginTop: 4 },
  detailImage: {
    width: '100%',
    aspectRatio: 1.2,
    marginTop: spacing.md,
    backgroundColor: '#eef2f6',
  },
});
