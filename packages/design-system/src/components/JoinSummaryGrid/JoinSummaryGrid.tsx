import { StyleSheet, View } from 'react-native';
import { JoinSummaryTile, type JoinSummaryTileVariant } from '../JoinSummaryTile';

export type JoinSummaryGridItem = {
  label: string;
  value: string;
  variant?: JoinSummaryTileVariant;
};

export type JoinSummaryGridProps = {
  items: JoinSummaryGridItem[];
};

export function JoinSummaryGrid({ items }: JoinSummaryGridProps) {
  const rows: JoinSummaryGridItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return (
    <View style={styles.wrap}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((item) => (
            <JoinSummaryTile
              key={item.label}
              label={item.label}
              value={item.value}
              variant={item.variant}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
