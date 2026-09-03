import { StyleSheet, View } from 'react-native';
import { JoinCapacityRow } from '../JoinCapacityRow';
import { Text } from '../../primitives/Text';

export type JoinCapacitySummaryProps = {
  countLabel: string;
  seatsHighlight?: string | null;
  seatsHighlightTone?: 'available' | 'lastSeat' | 'full';
  slotLabel?: string | null;
  deadlineLabel?: string | null;
};

export function JoinCapacitySummary({
  countLabel,
  seatsHighlight,
  seatsHighlightTone,
  slotLabel,
  deadlineLabel,
}: JoinCapacitySummaryProps) {
  return (
    <View style={styles.wrap}>
      {slotLabel ? (
        <Text variant="body" tone="secondary">{slotLabel}</Text>
      ) : (
        <JoinCapacityRow
          countLabel={countLabel}
          seatsHighlight={seatsHighlight}
          highlightTone={seatsHighlightTone}
        />
      )}
      {deadlineLabel ? (
        <Text variant="caption" tone="tertiary">{deadlineLabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
});
