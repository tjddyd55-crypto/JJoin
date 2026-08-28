import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import type { JoinDiscoveryRegion } from '@jjoin/domain';

export type RegionChip = {
  key: string;
  region: JoinDiscoveryRegion;
  disabled?: boolean;
};

type Props = {
  chips: RegionChip[];
  selectedKey: string;
  onSelect: (region: JoinDiscoveryRegion) => void;
  onChangeRegion: () => void;
};

export function RegionQuickPicks({
  chips,
  selectedKey,
  onSelect,
  onChangeRegion,
}: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {chips.map((chip) => {
          const selected = chip.key === selectedKey;
          return (
            <Pressable
              key={chip.key}
              disabled={chip.disabled}
              onPress={() => onSelect(chip.region)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !!chip.disabled }}
              accessibilityLabel={`${chip.region.label}${selected ? ', 선택됨' : ''}${chip.disabled ? ', 사용 불가' : ''}`}
              style={[
                styles.chip,
                {
                  borderColor: selected ? gold : theme.colors.border.subtle,
                  backgroundColor: selected
                    ? theme.colors.surface.card
                    : theme.colors.surface.base,
                  opacity: chip.disabled ? 0.45 : 1,
                },
              ]}
            >
              <Text
                variant="meta"
                style={selected ? { color: gold } : undefined}
                tone={selected ? 'primary' : 'secondary'}
              >
                {chip.region.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={onChangeRegion}
          accessibilityRole="button"
          accessibilityLabel="지역 변경"
          style={[
            styles.chip,
            {
              borderColor: theme.colors.border.subtle,
              backgroundColor: theme.colors.surface.base,
            },
          ]}
        >
          <Text variant="meta" tone="secondary">
            지역 변경
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xs,
  },
  row: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
});
