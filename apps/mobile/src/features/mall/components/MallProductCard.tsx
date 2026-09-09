import { Image, Pressable, StyleSheet, Text as RNText, View, useWindowDimensions } from 'react-native';
import type { MallProductListItemDto } from '@jjoin/types';
import { mallColors, mallMetrics } from '../mallDesignTokens';
import { formatMallCoinKo } from '../mallFormat';

type Props = {
  product: MallProductListItemDto;
  onPress: () => void;
};

export function MallProductCard({ product, onPress }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth =
    (width - mallMetrics.screenPadding * 2 - mallMetrics.gridColumnGap) / 2;
  const soldOut = product.purchaseState === 'sold_out' || product.purchaseState === 'paused';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { width: cardWidth, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.card, { minHeight: mallMetrics.productCardMinHeight }]}>
        <View style={styles.imageWrap}>
          {product.coverImageUrl ? (
            <Image source={{ uri: product.coverImageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]} />
          )}
          {product.badge ? (
            <View style={styles.badge}>
              <RNText style={styles.badgeText}>{product.badge}</RNText>
            </View>
          ) : null}
          {soldOut ? <View style={styles.dim} /> : null}
        </View>
        <View style={styles.body}>
          <RNText style={styles.name} numberOfLines={mallMetrics.productTitleLines}>
            {product.name}
          </RNText>
          <View style={styles.priceRow}>
            <RNText style={styles.price}>{formatMallCoinKo(product.coinPrice)}</RNText>
            <RNText style={styles.heart}>♡</RNText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: mallMetrics.gridRowGap },
  card: {
    borderRadius: mallMetrics.productCardRadius,
    borderWidth: 1,
    borderColor: mallColors.border,
    backgroundColor: mallColors.surface,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    height: mallMetrics.productImageHeight,
    backgroundColor: mallColors.surfaceMuted,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: mallColors.surfaceMuted },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    height: mallMetrics.badgeHeight,
    borderRadius: mallMetrics.badgeRadius,
    backgroundColor: mallColors.accentGreenSoft,
    paddingHorizontal: mallMetrics.badgePaddingH,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: mallColors.accentGreen,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  body: {
    paddingHorizontal: mallMetrics.productCardBodyPadding,
    paddingTop: 14,
    paddingBottom: 12,
  },
  name: {
    minHeight: mallMetrics.productTitleMinHeight,
    fontSize: mallMetrics.productNameSize,
    fontWeight: '600',
    color: mallColors.textPrimary,
    lineHeight: 20,
  },
  priceRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: mallMetrics.productPriceSize,
    fontWeight: '700',
    color: mallColors.accentGreen,
  },
  heart: {
    fontSize: 22,
    color: mallColors.textPrimary,
    lineHeight: 24,
  },
});
