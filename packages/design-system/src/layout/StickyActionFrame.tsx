import { View, StyleSheet, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import {
  STICKY_ACTION_HORIZONTAL_PADDING,
  STICKY_ACTION_TOP_PADDING,
  stickyActionBottomPadding,
} from './stickyActionInsets';

export type StickyActionFrameProps = ViewProps & {
  /** @deprecated border is always shown; kept for API compatibility */
  showDivider?: boolean;
};

export function StickyActionFrame({
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
          borderTopColor: theme.colors.border.subtle,
          paddingHorizontal: STICKY_ACTION_HORIZONTAL_PADDING,
          paddingTop: STICKY_ACTION_TOP_PADDING,
          paddingBottom: stickyActionBottomPadding(insets.bottom),
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
  root: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
