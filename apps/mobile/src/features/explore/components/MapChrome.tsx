import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, colors, radius, spacing } from '@jjoin/design-system';
import type { ExploreFilterId } from '../model/map-types';

const FILTERS: { id: ExploreFilterId; label: string }[] = [
  { id: 'ALL', label: '전체' },
  { id: 'VENUE', label: '골프장' },
  { id: 'USER', label: '사람' },
  { id: 'TODAY_JOIN', label: '오늘 조인' },
];

export function MapSearchBar({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.search} accessibilityRole="button">
      <AppText variant="body" color="textSecondary">
        🔍  장소나 지역을 검색하세요
      </AppText>
    </Pressable>
  );
}

export function MapFilterBar({
  value,
  onChange,
}: {
  value: ExploreFilterId;
  onChange: (next: ExploreFilterId) => void;
}) {
  return (
    <View style={styles.filters}>
      {FILTERS.map((f) => {
        const on = f.id === value;
        return (
          <Pressable
            key={f.id}
            onPress={() => onChange(f.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <AppText
              variant="caption"
              color={on ? undefined : 'textPrimary'}
              style={on ? styles.chipOnText : undefined}
            >
              {f.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CurrentLocationButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.fab}
      accessibilityRole="button"
      accessibilityLabel="현재 위치로 이동"
      hitSlop={4}
    >
      <AppText variant="subtitle" color="primary">
        ◎
      </AppText>
    </Pressable>
  );
}

export function ReSearchAreaButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.reSearch} accessibilityRole="button">
      <AppText variant="caption" color="primary">
        이 지역 재검색
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipOnText: {
    color: colors.white,
    fontWeight: '600',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reSearch: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
