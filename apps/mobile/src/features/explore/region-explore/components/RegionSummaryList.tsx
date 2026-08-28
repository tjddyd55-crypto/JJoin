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
  bottomPadding?: number;
  leadingItem?: {
    key: string;
    label: string;
    count?: number;
    onPress: () => void;
  };
};

function CountText({ count, gold, muted }: { count: number; gold: string; muted: string }) {
  return (
    <Text
      variant="bodyStrong"
      style={{ color: count > 0 ? gold : muted, minWidth: 24, textAlign: 'right' }}
    >
      {count}
    </Text>
  );
}

export function RegionSummaryList({
  items,
  loading,
  error,
  onRetry,
  onSelect,
  bottomPadding = spacing.xl,
  leadingItem,
}: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;
  const muted = theme.colors.text.tertiary;

  if (loading && items.length === 0 && !leadingItem) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator color={gold} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
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
    <ScrollView
      contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      {loading ? (
        <View style={styles.loadingInline}>
          <ActivityIndicator color={gold} size="small" />
        </View>
      ) : null}
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
              <CountText count={leadingItem.count} gold={gold} muted={muted} />
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
          <CountText count={item.count} gold={gold} muted={muted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  label: {
    flex: 1,
  },
  countWrap: {
    minWidth: 32,
    alignItems: 'flex-end',
  },
  loadingRow: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadingInline: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  errorBox: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  retry: {
    padding: spacing.sm,
  },
});
