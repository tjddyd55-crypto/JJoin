import {
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import { opacity } from '../../tokens';
import type { IconName } from '../../icons/iconTypes';
import { Icon } from '../../icons/Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth = true,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const height = theme.sizes.button[size];

  const palette = (() => {
    switch (variant) {
      case 'primary':
        return {
          bg: theme.colors.action.primary,
          border: theme.colors.action.primary,
          // Fresh Lime CTA uses Deep Navy text — never white on lime
          text: theme.colors.text.onPrimary,
          icon: 'onPrimary' as const,
        };
      case 'secondary':
        return {
          bg: theme.colors.action.secondary,
          border: theme.colors.border.subtle,
          text: theme.colors.text.primary,
          icon: 'primary' as const,
        };
      case 'ghost':
        return {
          bg: theme.colors.action.ghost,
          border: 'transparent',
          text: theme.colors.text.primary,
          icon: 'primary' as const,
        };
      case 'danger':
        return {
          bg: theme.colors.action.danger,
          border: theme.colors.action.danger,
          text: theme.colors.text.primary,
          icon: 'primary' as const,
        };
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: height,
          borderRadius: theme.radius.md,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: isDisabled ? opacity.disabled : pressed ? opacity.pressed : 1,
          alignSelf: fullWidth ? ('stretch' as const) : ('flex-start' as const),
        },
        style as StyleProp<ViewStyle>,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <Icon name={leftIcon} size="md" tone="primary" /> : null}
          <Text variant="button" style={{ color: palette.text }}>
            {label}
          </Text>
          {rightIcon ? <Icon name={rightIcon} size="md" tone="primary" /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
