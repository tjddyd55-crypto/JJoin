import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';

type Props = {
  coverImageUrl: string | null;
  photos: Array<{ id: string; imageUrl: string | null; isCover?: boolean }>;
};

export function StorePhotoCarousel({ coverImageUrl, photos }: Props) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const carouselWidth = Math.max(280, width - spacing.md * 2);
  const [page, setPage] = useState(0);

  const urls = useMemo(
    () => [
      ...(coverImageUrl ? [coverImageUrl] : []),
      ...photos
        .map((p) => p.imageUrl)
        .filter((url): url is string => Boolean(url && url !== coverImageUrl)),
    ],
    [coverImageUrl, photos],
  );

  if (urls.length === 0) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.colors.surface.elevated, width: carouselWidth }]}>
        <Text tone="secondary">매장 사진 없음</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={[styles.carousel, { width: carouselWidth }]}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
          setPage(next);
        }}
      >
        {urls.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={[styles.image, { width: carouselWidth, height: Math.round(carouselWidth * 0.56) }]}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
      {urls.length > 1 ? (
        <View style={styles.indicatorRow}>
          <Text tone="secondary">{page + 1} / {urls.length}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  carousel: { marginHorizontal: -spacing.md },
  image: { borderRadius: 12 },
  placeholder: {
    height: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  indicatorRow: { alignItems: 'center' },
});
