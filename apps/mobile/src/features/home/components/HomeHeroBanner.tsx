import { Image, StyleSheet, View } from 'react-native';
import { Text, layoutSpacing, useTheme } from '@jjoin/design-system';

type Props = {
  title?: string;
  subtitle?: string;
};

/**
 * Home hero — Navy brand plate with owned symbol watermark (no venue/external photos).
 */
export function HomeHeroBanner({
  title = '오늘도 좋은 사람들과 라운딩 어때요?',
  subtitle = '나와 잘 맞는 조인을 찾아보세요',
}: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.action.primary,
        },
      ]}
    >
      <Image
        source={require('../../../../assets/branding/jjoinzone-symbol-navy.png')}
        style={styles.watermark}
        resizeMode="contain"
        accessibilityElementsHidden
      />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text variant="sectionTitle" tone="inverse" numberOfLines={2}>
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
    height: 148,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 0,
  },
  watermark: {
    position: 'absolute',
    right: -12,
    top: 12,
    width: 120,
    height: 120,
    opacity: 0.12,
    tintColor: '#FFFFFF',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23, 33, 43, 0.15)',
  },
  content: {
    flex: 1,
    paddingHorizontal: layoutSpacing.screenHorizontal,
    paddingVertical: 20,
    justifyContent: 'center',
    gap: 6,
  },
  subtitle: {
    opacity: 0.92,
  },
});
