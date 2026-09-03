import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Text } from '../../primitives/Text';
import { JoinVenueRow } from '../JoinVenueRow';
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
      <JoinVenueRow venueName={venueName} subLabel={distanceLabel} />
      {address?.trim() ? (
        <Text variant="meta" tone="secondary" style={styles.address}>
          {address.trim()}
        </Text>
      ) : null}
      {onOpenMap ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="지도에서 보기"
          onPress={onOpenMap}
          style={styles.mapAction}
        >
          <Icon name="location" size="sm" tone="secondary" />
          <Text variant="meta" tone="link">지도에서 보기</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  address: {
    marginTop: 2,
  },
  mapAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    marginTop: 4,
  },
});
