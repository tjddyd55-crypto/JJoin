import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';

/**
 * Unmatched route fallback — no useSession / app hooks (safe during HMR recovery).
 */
export default function NotFoundScreen() {
  const theme = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: '페이지 없음', headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.app.background }]}>
        <Text variant="sectionTitle" tone="primary">
          찾을 수 없는 화면입니다.
        </Text>
        <Link href="/(tabs)" style={styles.link}>
          <Text variant="bodyStrong" style={{ color: theme.colors.action.primary }}>
            홈으로 돌아가기
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  link: {
    paddingVertical: spacing.sm,
  },
});
