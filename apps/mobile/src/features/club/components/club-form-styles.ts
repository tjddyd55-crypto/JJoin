import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { spacing, useTheme } from '@jjoin/design-system';

export function useClubInputStyle() {
  const theme = useTheme();
  return useMemo(
    () => ({
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.surface.card,
    }),
    [theme],
  );
}

export const clubFormStyles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
