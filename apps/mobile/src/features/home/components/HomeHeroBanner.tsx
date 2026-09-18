import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Text, layoutSpacing, useTheme } from '@jjoin/design-system';
import { GolfHeroIllustration } from './GolfHeroIllustration';

type Props = {
  title?: string;
  subtitle?: string;
  imageUrl?: string | null;
};

/**
 * Banner media is always center-cropped to the card bounds.
 * Explicit px size avoids Android left-anchoring large bitmaps with %.
 */
export function HomeHeroBanner({
  title = '오늘도 좋은 사람들과 라운딩 어때요?',
  subtitle = '나와 잘 맞는 조인을 찾아보세요',
  imageUrl = null,
}: Props) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 160 });

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    if (
      Math.round(width) === Math.round(size.width) &&
      Math.round(height) === Math.round(size.height)
    ) {
      return;
    }
    setSize({ width, height });
  }

  const hasImage = Boolean(imageUrl && imageUrl.trim().length > 0);
  const mediaReady = size.width > 0 && size.height > 0;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.wrap,
        {
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.action.primary,
        },
      ]}
    >
      <View style={styles.mediaLayer} pointerEvents="none">
        {hasImage && mediaReady ? (
          <Image
            source={{ uri: imageUrl as string }}
            style={{ width: size.width, height: size.height }}
            resizeMode="cover"
          />
        ) : null}
        {!hasImage && mediaReady ? (
          <GolfHeroIllustration
            width={size.width}
            height={size.height}
            skyTop={theme.colors.map.accent}
            skyBottom={theme.colors.state.active}
            hillFar={theme.colors.state.selectedSurface}
            hillNear={theme.colors.state.active}
            fairway={theme.colors.brand.limeAccent}
            ball={theme.colors.text.inverse}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.overlay,
          { backgroundColor: theme.colors.action.primary },
        ]}
      />
      <View style={styles.content}>
        <Text variant="screenTitle" tone="inverse" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        <Text variant="meta" tone="inverse" numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 160,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  mediaLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.62,
  },
  content: {
    flex: 1,
    paddingHorizontal: layoutSpacing.screenHorizontalCompact,
    paddingVertical: 20,
    justifyContent: 'center',
    gap: 6,
    maxWidth: '72%',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.92,
  },
});
