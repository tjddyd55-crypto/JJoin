import { useState } from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { BrandMark } from '../BrandMark';
import { Icon } from '../../icons';
import { useTheme } from '../../theme';
import { sizes } from '../../tokens';

export type ClubCoverFallbackTone = 'green' | 'blue';

export type ClubCoverProps = {
  uri?: string | null;
  /** Square list thumbnail (default 84). */
  size?: number;
  /** Full-width hero cover with 16:9 aspect ratio. */
  variant?: 'list' | 'hero';
  heroWidth?: number;
  fallbackTone?: ClubCoverFallbackTone;
  imageStyle?: StyleProp<ImageStyle>;
  style?: StyleProp<ViewStyle>;
};

export function ClubCover({
  uri,
  size = sizes.clubCover.list,
  variant = 'list',
  heroWidth,
  fallbackTone = 'green',
  imageStyle,
  style,
}: ClubCoverProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const showFallback = !uri || failed;
  const isHero = variant === 'hero';
  const width = isHero ? (heroWidth ?? size) : size;
  const height = isHero ? Math.round(width * 9 / 16) : size;
  const radius = isHero ? theme.radius.lg : theme.radius.clubCover;

  const fallbackBg =
    fallbackTone === 'blue'
      ? theme.colors.join.surface.info
      : theme.colors.join.surface.success;

  if (!showFallback) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width, height, borderRadius: radius, borderColor: theme.colors.border.subtle },
          imageStyle,
        ]}
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: fallbackBg,
          borderColor: theme.colors.border.subtle,
        },
        style,
      ]}
      accessibilityLabel="동호회 기본 커버"
    >
      <BrandMark variant="symbol" tone="default" />
      <View style={styles.golfIcon}>
        <Icon name="golf" size="sm" tone="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  golfIcon: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    opacity: 0.85,
  },
});
