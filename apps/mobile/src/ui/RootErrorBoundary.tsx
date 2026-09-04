import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, ThemeProvider, clubMinimalTheme, spacing } from '@jjoin/design-system';
import type { ErrorBoundaryProps } from 'expo-router';

/**
 * Root error fallback — must not call useSession or other app context hooks.
 * Expo may render this during Fast Refresh recovery outside a stable provider tree.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <ThemeProvider theme={clubMinimalTheme}>
      <View style={styles.root}>
        <Text variant="sectionTitle" tone="primary">
          일시적인 오류
        </Text>
        <Text variant="body" tone="secondary" style={styles.message}>
          {error.message || '화면을 불러오지 못했습니다.'}
        </Text>
        <Pressable onPress={retry} style={styles.retry} accessibilityRole="button">
          <Text variant="bodyStrong" style={{ color: clubMinimalTheme.colors.action.primary }}>
            다시 시도
          </Text>
        </Pressable>
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: clubMinimalTheme.colors.app.background,
  },
  message: {
    textAlign: 'center',
  },
  retry: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
