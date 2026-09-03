import { StyleSheet, View } from 'react-native';
import { Chip } from '../Chip';

export type JoinRequirementChipsProps = {
  labels: string[];
};

export function JoinRequirementChips({ labels }: JoinRequirementChipsProps) {
  const items = labels.filter((l) => l.trim().length > 0).slice(0, 6);
  if (items.length === 0) return null;

  return (
    <View style={styles.row}>
      {items.map((label) => (
        <Chip key={label} label={label} variant="filter" />
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
});
