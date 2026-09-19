import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';

type Props = {
  coverImageUrl: string | null;
  photos: Array<{ id: string; imageUrl: string | null; isCover?: boolean }>;
};

export function StorePhotoCarousel({ coverImageUrl, photos }: Props) {
  const theme = useTheme();
  const urls = [
    ...(coverImageUrl ? [coverImageUrl] : []),
    ...photos.map((p) => p.imageUrl).filter((url): url is string => Boolean(url && url !== coverImageUrl)),
  ];

  if (urls.length === 0) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.colors.surface.elevated }]}>
        <Text tone="secondary">매장 사진 없음</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
      {urls.map((url) => (
        <Image key={url} source={{ uri: url }} style={styles.image} resizeMode="cover" />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  carousel: { marginHorizontal: -spacing.md },
  image: { width: 320, height: 200 },
  placeholder: {
    height: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
