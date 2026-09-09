import { StyleSheet, View } from 'react-native';
import { mallColors, mallMetrics } from '../mallDesignTokens';

type Props = {
  /** Vertical space above and below the divider line. */
  spacing?: number;
};

export function MallSectionDivider({ spacing = 20 }: Props) {
  return <View style={[styles.wrap, { marginVertical: spacing }]} />;
}

const styles = StyleSheet.create({
  wrap: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: mallMetrics.screenPadding,
    backgroundColor: mallColors.border,
  },
});
