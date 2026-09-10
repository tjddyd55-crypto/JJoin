import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { Text } from '../../primitives/Text';
import { Icon } from '../../icons/Icon';
import { useTheme } from '../../theme';
import { spacing } from '../../tokens';

export type SelectTriggerProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

/** Compact single-line control — always reads as selectable (chevron retained). */
export function SelectTrigger({ label, onPress, disabled, style }: SelectTriggerProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        {
          minHeight: theme.sizes.input.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <Text variant="body" tone={label ? 'primary' : 'tertiary'} numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      <Icon name="chevronDown" size="sm" tone="tertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  label: {
    flex: 1,
    minWidth: 0,
  },
});
