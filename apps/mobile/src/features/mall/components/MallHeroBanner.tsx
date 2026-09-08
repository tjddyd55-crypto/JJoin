import { StyleSheet, View } from 'react-native';
import { Card, Text, spacing, useTheme } from '@jjoin/design-system';

export function MallHeroBanner() {
  const theme = useTheme();

  return (
    <Card variant="elevated" padding="none" style={styles.banner}>
      <View style={[styles.inner, { backgroundColor: theme.colors.action.primary }]}>
        <Text variant="caption" style={styles.kicker}>JJOIN 리워드 몰</Text>
        <Text variant="sectionTitle" style={styles.title}>
          조인하고 받은 코인으로{'\n'}리워드 상품을 만나보세요
        </Text>
        <Text variant="body" style={styles.subtitle}>
          보유 코인으로 교환 가능한 상품을 모았습니다
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: spacing.md, overflow: 'hidden' },
  inner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
    borderRadius: 16,
  },
  kicker: { color: 'rgba(255,255,255,0.72)' },
  title: { color: '#fff' },
  subtitle: { color: 'rgba(255,255,255,0.86)', marginTop: 4 },
});
