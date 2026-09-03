import { StyleSheet, View } from 'react-native';
import { Text, layoutSpacing, useTheme } from '@jjoin/design-system';
import { GolfHeroIllustration } from './GolfHeroIllustration';

type Props = {
  title?: string;
  subtitle?: string;
};

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
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GolfHeroIllustration
          width={400}
          height={170}
          skyTop={theme.colors.map.accent}
          skyBottom={theme.colors.state.active}
          hillFar={theme.colors.state.selectedSurface}
          hillNear={theme.colors.state.active}
          fairway={theme.colors.brand.limeAccent}
          ball={theme.colors.text.inverse}
        />
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
    overflow: 'hidden',
    position: 'relative',
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
