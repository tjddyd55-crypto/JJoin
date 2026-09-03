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
      <View style={styles.textRow}>
        {countLabel ? (
          <Text variant="meta" tone="secondary" numberOfLines={1} style={styles.count}>
            {countLabel}
          </Text>
        ) : null}
        {seatsHighlight ? (
          <Text
            variant="caption"
            numberOfLines={1}
            style={[styles.highlight, { color: highlightColor }]}
          >
            {seatsHighlight}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  textRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  count: {
    fontSize: 14,
    lineHeight: 20,
  },
  highlight: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
