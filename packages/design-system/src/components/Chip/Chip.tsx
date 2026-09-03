import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import { opacity } from '../../tokens';

export type ChipVariant = 'filter' | 'selected' | 'quickAdd';

export type ChipProps = PressableProps & {
  label: string;
  variant?: ChipVariant;
  selected?: boolean;
};

export function Chip({ label, variant = 'filter', selected = false, disabled, style, ...rest }: ChipProps) {
  const theme = useTheme();
  const isSelected = selected || variant === 'selected';

  const bg = isSelected
    ? theme.colors.state.selectedSurface
    : variant === 'quickAdd'
      ? theme.colors.surface.elevated
      : theme.colors.surface.card;

  const border = isSelected ? theme.colors.state.selectedBorder : theme.colors.border.subtle;
  const textTone = isSelected ? 'success' : variant === 'quickAdd' ? 'primary' : 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, selected: isSelected }}
      disabled={disabled}
            style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: border,
          borderRadius: theme.radius.full,
          opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
          alignSelf: 'stretch',
        },
        style as StyleProp<ViewStyle>,
      ]}
      {...rest}
    >
      <Text variant={variant === 'quickAdd' ? 'bodyStrong' : 'meta'} tone={textTone}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
