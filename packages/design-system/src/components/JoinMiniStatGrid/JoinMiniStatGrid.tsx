import { StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinMiniStatTile = {
  label: string;
  value: string;
  valueColor?: string;
};

export type JoinMiniStatGridProps = {
  items: JoinMiniStatTile[];
};

export function JoinMiniStatGrid({ items }: JoinMiniStatGridProps) {
  const theme = useTheme();
  if (items.length === 0) return null;

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            styles.tile,
            {
              backgroundColor: theme.colors.join.surface.info,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Text variant="caption" tone="secondary" style={styles.label}>
            {item.label}
          </Text>
          <Text
            variant="meta"
            tone="primary"
            numberOfLines={1}
            style={[
              styles.value,
              item.valueColor ? { color: item.valueColor } : null,
            ]}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
});
