import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, spacing, useTheme } from '@jjoin/design-system';

const FAB_SIZE = 56;

/** 조인 탭 탐색 화면 공통 — create route 재사용 */
export function JoinCreateFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const bottom =
    Math.max(insets.bottom, spacing.sm) + theme.sizes.bottomNav + spacing.md;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      <Pressable
        onPress={() => router.push('/(tabs)/create')}
        accessibilityRole="button"
        accessibilityLabel="조인 만들기"
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.action.primary,
            shadowColor: '#000',
          },
        ]}
      >
        <Icon name="plus" size="md" tone="inverse" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    right: spacing.md + 4,
    zIndex: 20,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
  },
});
