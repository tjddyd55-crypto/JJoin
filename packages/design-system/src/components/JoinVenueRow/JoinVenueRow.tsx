import { StyleSheet, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Text } from '../../primitives/Text';

export type JoinVenueRowProps = {
  venueName: string;
  subLabel?: string | null;
};

export function JoinVenueRow({ venueName, subLabel }: JoinVenueRowProps) {
  const line = subLabel ? `${venueName} · ${subLabel}` : venueName;
  return (
    <View style={styles.row}>
      <Icon name="location" size="sm" tone="tertiary" />
      <Text variant="meta" tone="secondary" numberOfLines={1} style={styles.text}>
        {line}
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
