import { StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinSummaryTileVariant = 'info' | 'success';

export type JoinSummaryTileProps = {
  label: string;
  value: string;
  variant?: JoinSummaryTileVariant;
};

export function JoinSummaryTile({ label, value, variant = 'info' }: JoinSummaryTileProps) {
  const theme = useTheme();
  const isSuccess = variant === 'success';
  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: isSuccess
            ? theme.colors.join.status.openSurface
            : theme.colors.join.surface.info,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text variant="caption" tone="secondary" style={styles.label}>
        {label}
      </Text>
      <Text
        variant="sectionTitle"
        numberOfLines={1}
        style={[
          styles.value,
          isSuccess ? { color: theme.colors.join.capacity.available } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  value: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
});
