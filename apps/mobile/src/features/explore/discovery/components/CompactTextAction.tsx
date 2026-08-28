import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

/** 빈 상태 등 보조 CTA — full-width Button 대신 compact pill */
export function CompactTextAction({ label, onPress, accessibilityLabel }: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.chip,
        {
          borderColor: theme.colors.border.subtle,
          backgroundColor: theme.colors.surface.card,
        },
      ]}
    >
      <Text variant="meta" style={{ color: gold }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
