import { StyleSheet, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinCapacityRowProps = {
  countLabel: string;
  seatsHighlight?: string | null;
  highlightTone?: 'available' | 'lastSeat' | 'full';
};

export function JoinCapacityRow({
  countLabel,
  seatsHighlight,
  highlightTone = 'available',
}: JoinCapacityRowProps) {
  const theme = useTheme();
  const highlightColor =
    highlightTone === 'lastSeat'
      ? theme.colors.join.capacity.lastSeat
      : highlightTone === 'full'
        ? theme.colors.join.capacity.full
        : theme.colors.join.capacity.available;

  return (
    <View style={styles.row}>
      <Icon name="people" size="sm" tone="tertiary" />
      <Text variant="meta" tone="secondary" numberOfLines={1} style={styles.text}>
        {countLabel}
        {seatsHighlight ? (
          <Text variant="meta" style={{ color: highlightColor }}>
            {` · ${seatsHighlight}`}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  text: {
    flex: 1,
  },
});
