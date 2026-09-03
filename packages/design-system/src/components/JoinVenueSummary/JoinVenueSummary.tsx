import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinVenueSummaryProps = {
  venueName: string;
  address?: string | null;
  distanceLabel?: string | null;
  onOpenMap?: () => void;
};

export function JoinVenueSummary({
  venueName,
  address,
  distanceLabel,
  onOpenMap,
}: JoinVenueSummaryProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <View style={styles.nameRow}>
        <Icon name="location" size="sm" tone="tertiary" />
        <Text variant="sectionTitle" tone="primary" numberOfLines={2} style={styles.venueName}>
          {venueName}
        </Text>
      </View>
      {address?.trim() ? (
        <Text variant="meta" tone="secondary" style={styles.address}>
          {address.trim()}
        </Text>
      ) : null}
      <View style={styles.footerRow}>
        {distanceLabel ? (
          <Text variant="meta" tone="secondary" numberOfLines={1} style={styles.distance}>
            {distanceLabel.startsWith('내 위치')
              ? distanceLabel
              : `내 위치에서 ${distanceLabel}`}
          </Text>
        ) : (
          <View style={styles.distance} />
        )}
        {onOpenMap ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="지도에서 보기"
            onPress={onOpenMap}
            hitSlop={8}
            style={styles.mapAction}
          >
            <Text
              variant="caption"
              style={[styles.mapLabel, { color: theme.colors.join.dday.text }]}
            >
              지도에서 보기 ›
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  venueName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
  },
  address: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 22,
  },
  distance: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  mapAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  mapLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
