import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import type { DiscoverRegionSummaryItemDto } from '@jjoin/types';

type Props = {
  items: DiscoverRegionSummaryItemDto[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (item: DiscoverRegionSummaryItemDto) => void;
  leadingItem?: {
    key: string;
    label: string;
    count?: number;
    onPress: () => void;
  };
};

export function RegionSummaryList({
  items,
  loading,
  error,
  onRetry,
  onSelect,
  leadingItem,
}: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={gold} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="body" tone="secondary">
          {error}
        </Text>
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text variant="meta" style={{ color: gold }}>
            다시 시도
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {leadingItem ? (
        <Pressable
          onPress={leadingItem.onPress}
          style={[
            styles.row,
            { borderBottomColor: theme.colors.border.subtle },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${leadingItem.label}${leadingItem.count != null ? ` 조인 ${leadingItem.count}개` : ''}`}
        >
          <Text variant="body" tone="primary" style={styles.label}>
            {leadingItem.label}
          </Text>
          <View style={styles.countWrap}>
            {leadingItem.count != null ? (
              <Text variant="sectionTitle" style={{ color: gold }}>
                {leadingItem.count}
              </Text>
            ) : (
              <Text variant="meta" tone="tertiary">
                {'\u203A'}
              </Text>
            )}
          </View>
        </Pressable>
      ) : null}
      {items.map((item) => (
        <Pressable
          key={`${item.sido}|${item.sigungu ?? ''}`}
          onPress={() => onSelect(item)}
          style={[
            styles.row,
            { borderBottomColor: theme.colors.border.subtle },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${item.label} 조인 ${item.count}개`}
        >
          <Text variant="body" tone="primary" style={styles.label}>
            {item.label}
          </Text>
          <Text variant="sectionTitle" style={{ color: gold }}>
            {item.count}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  label: {
    flex: 1,
  },
  countWrap: {
    minWidth: 32,
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  retry: {
    padding: spacing.sm,
  },
});
