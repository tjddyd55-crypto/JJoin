import { View, StyleSheet } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type RecommendationReasonTagProps = {
  label: string;
};

/** Compact recommendation reason — never a large sentence chip. */
export function RecommendationReasonTag({ label }: RecommendationReasonTagProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.state.selectedSurface,
          borderRadius: theme.radius.full,
          borderColor: theme.colors.state.selectedBorder,
        },
      ]}
    >
      <Text variant="meta" tone="success" style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
});
