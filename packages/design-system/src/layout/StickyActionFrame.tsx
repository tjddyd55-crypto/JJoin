import { View, StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { Divider } from '../primitives/Divider';

export type StickyActionFrameProps = ViewProps & {
  showDivider?: boolean;
};

export function StickyActionFrame({
  showDivider = true,
  style,
  children,
  ...rest
}: StickyActionFrameProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surface.base,
          paddingHorizontal: theme.layoutSpacing.screenHorizontal,
          paddingTop: theme.spacing.sm,
          paddingBottom: Math.max(insets.bottom, theme.spacing.sm),
        },
        style,
      ]}
      {...rest}
    >
      {showDivider ? <Divider /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  content: { gap: 12 },
});
