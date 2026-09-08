import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Badge, Card, Text, spacing, useTheme } from '@jjoin/design-system';
import { formatCoinWithLabel } from '@jjoin/domain';
import type { MallProductListItemDto } from '@jjoin/types';

type Props = {
  product: MallProductListItemDto;
  onPress: () => void;
};

export function MallProductCard({ product, onPress }: Props) {
  const theme = useTheme();
  const soldOut = product.purchaseState === 'sold_out' || product.purchaseState === 'paused';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.92 : 1 }]}
    >
      <Card variant="elevated" padding="none" style={styles.card}>
        <View style={styles.imageWrap}>
          {product.coverImageUrl ? (
            <Image source={{ uri: product.coverImageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { backgroundColor: theme.colors.surface.soft }]} />
          )}
          {product.badge ? (
            <View style={styles.badge}>
              <Badge label={product.badge} variant={soldOut ? 'neutral' : 'success'} />
            </View>
          ) : null}
          {soldOut ? <View style={styles.dim} /> : null}
        </View>
        <View style={styles.body}>
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {product.categoryName}
          </Text>
          <Text variant="bodyStrong" numberOfLines={2} style={styles.name}>
            {product.name}
          </Text>
          {product.shortDescription ? (
            <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.desc}>
              {product.shortDescription}
            </Text>
          ) : null}
          <Text variant="coinMedium" tone="success" style={styles.price}>
            {formatCoinWithLabel(product.coinPrice)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: '46%', maxWidth: '50%' },
  card: { overflow: 'hidden' },
  imageWrap: { position: 'relative', aspectRatio: 1, backgroundColor: '#f4f6f8' },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: spacing.xs, left: spacing.xs },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  body: { padding: spacing.sm, gap: 4 },
  name: { minHeight: 40 },
  desc: { marginTop: 2 },
  price: { marginTop: spacing.xs },
});
