import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '../../icons/Icon';
import type { IconName } from '../../icons/iconTypes';
import { useTheme } from '../../theme';
import { opacity } from '../../tokens';

export type IconButtonVariant = 'ghost' | 'surface' | 'selected';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export type IconButtonProps = PressableProps & {
  icon: IconName;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  accessibilityLabel: string;
  selected?: boolean;
};

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  selected = false,
  disabled,
  accessibilityLabel,
  style,
  ...rest
}: IconButtonProps) {
  const theme = useTheme();
  const dimension = size === 'sm' ? 36 : size === 'md' ? 44 : 48;
  const effectiveVariant = selected ? 'selected' : variant;

  const bg = (() => {
    switch (effectiveVariant) {
      case 'surface':
        return theme.colors.surface.elevated;
      case 'selected':
        return theme.colors.surface.floating;
      case 'ghost':
      default:
        return 'transparent';
    }
  })();

  const tone = effectiveVariant === 'selected' ? 'primary' : 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: dimension,
          height: dimension,
          borderRadius: theme.radius.md,
          backgroundColor: bg,
          borderColor: effectiveVariant === 'selected' ? theme.colors.border.subtle : 'transparent',
          opacity: disabled ? opacity.disabled : pressed ? opacity.pressed : 1,
        },
        style as StyleProp<ViewStyle>,
      ]}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 'sm' : 'md'} tone={tone} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
