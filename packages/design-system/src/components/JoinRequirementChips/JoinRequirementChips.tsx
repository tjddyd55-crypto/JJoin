import { StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinRequirementChipsProps = {
  labels: string[];
};

export function JoinRequirementChips({ labels }: JoinRequirementChipsProps) {
  const theme = useTheme();
  const items = labels.filter((l) => l.trim().length > 0).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <View style={styles.row}>
      {items.map((label) => (
        <View
          key={label}
          style={[
            styles.chip,
            {
              backgroundColor: theme.colors.join.status.fullSurface,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          <Text variant="caption" tone="secondary" style={styles.chipText}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
