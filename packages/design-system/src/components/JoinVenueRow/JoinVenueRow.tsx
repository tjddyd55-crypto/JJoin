import { StyleSheet, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Text } from '../../primitives/Text';

export type JoinVenueRowProps = {
  venueName: string;
  subLabel?: string | null;
  /** List cards use primary venue line; detail venue card uses its own summary. */
  emphasis?: 'list' | 'detail';
};

export function JoinVenueRow({ venueName, subLabel, emphasis = 'list' }: JoinVenueRowProps) {
  const line = subLabel ? `${venueName} · ${subLabel}` : venueName;
  return (
    <View style={styles.row}>
      <Icon name="location" size="sm" tone="tertiary" />
      <Text
        variant="meta"
        tone={emphasis === 'list' ? 'primary' : 'secondary'}
        numberOfLines={1}
        style={styles.text}
      >
        {line}
      </Text>
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
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
