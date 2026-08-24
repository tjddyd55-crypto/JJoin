import { Pressable, View, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from '../../theme';
import { type SpacingToken } from '../../tokens';

export type CardVariant = 'base' | 'elevated' | 'floating' | 'interactive';
export type CardPadding = 'none' | 'sm' | 'md';

export type CardProps = ViewProps & {
  variant?: CardVariant;
  padding?: CardPadding;
  onPress?: () => void;
};

const paddingMap: Record<CardPadding, 0 | SpacingToken> = {
  none: 0,
  sm: 'sm',
  md: 'md',
};

export function Card({
  variant = 'base',
  padding = 'md',
  onPress,
  style,
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();
  const bg = (() => {
    switch (variant) {
      case 'elevated':
        return theme.colors.surface.elevated;
      case 'floating':
        return theme.colors.surface.floating;
      case 'interactive':
      case 'base':
      default:
        return theme.colors.surface.card;
    }
  })();

  const padToken = paddingMap[padding];
  const padValue = padToken === 0 ? 0 : theme.spacing[padToken];

  const content = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border.subtle,
          padding: padValue,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  base: { borderWidth: 1 },
});
