import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@jjoin/design-system';
import { mallColors, mallMetrics } from '../mallDesignTokens';

type Props = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function MallFilterChip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
      ]}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : undefined]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: mallMetrics.chipHeight,
    borderRadius: mallMetrics.chipRadius,
    paddingHorizontal: mallMetrics.chipPaddingH,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: mallColors.accentGreenSoft,
    borderColor: mallColors.accentGreen,
  },
  chipDefault: {
    backgroundColor: mallColors.surface,
    borderColor: mallColors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: mallColors.textPrimary,
  },
  labelSelected: {
    fontWeight: '600',
    color: mallColors.accentGreen,
  },
});
