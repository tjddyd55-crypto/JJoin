import { View, StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../tokens';
import { useTheme } from '../theme';

type Props = ViewProps;

/** @deprecated Prefer `StickyActionFrame` — uses Club Minimal theme tokens. */
export function BottomActionBar({ style, children, ...rest }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        {
          borderTopColor: theme.colors.border.subtle,
          backgroundColor: theme.colors.surface.base,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
});
