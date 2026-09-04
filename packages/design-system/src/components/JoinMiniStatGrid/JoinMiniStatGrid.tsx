import { StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { fontFamily } from '../../tokens';
import { useTheme } from '../../theme';

export type JoinMiniStatSurface = 'info' | 'success' | 'neutral';

export type JoinMiniStatTile = {
  label: string;
  value: string;
  valueColor?: string;
  surface?: JoinMiniStatSurface;
};

export type JoinMiniStatGridProps = {
  items: JoinMiniStatTile[];
  columns?: 2 | 3;
};

export function JoinMiniStatGrid({ items, columns = 2 }: JoinMiniStatGridProps) {
  const theme = useTheme();
  if (items.length === 0) return null;

  const tileBasis = columns === 3 ? '31%' : '48%';

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const surface = item.surface ?? 'info';
        const backgroundColor =
          surface === 'success'
            ? theme.colors.join.surface.success
            : surface === 'neutral'
              ? theme.colors.surface.soft
              : theme.colors.join.surface.info;

        return (
          <View
            key={item.label}
            style={[
              styles.tile,
              { flexBasis: tileBasis, backgroundColor, borderRadius: theme.radius.joinStat },
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
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    flexGrow: 1,
    minWidth: 0,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fontFamily.sansSemiBold,
    fontWeight: '600',
  },
});
