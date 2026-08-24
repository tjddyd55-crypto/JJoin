import { View, StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

/** Visual frame for bottom sheets — separate from @gorhom/bottom-sheet runtime. */
export type BottomSheetFrameProps = ViewProps & {
  showHandle?: boolean;
};

export function BottomSheetFrame({
  showHandle = true,
  style,
  children,
  ...rest
}: BottomSheetFrameProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surface.elevated,
          borderTopLeftRadius: theme.radius.sheet,
          borderTopRightRadius: theme.radius.sheet,
          paddingHorizontal: theme.layoutSpacing.screenHorizontal,
          paddingBottom: Math.max(insets.bottom, theme.spacing.md),
        },
        style,
      ]}
      {...rest}
    >
      {showHandle ? (
        <View style={styles.handleRow}>
          <View
            style={{
              width: theme.sizes.sheetHandle.width,
              height: theme.sizes.sheetHandle.height,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.border.strong,
            }}
          />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 8 },
  handleRow: { alignItems: 'center', paddingVertical: 8 },
});
