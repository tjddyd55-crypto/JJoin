import { StyleSheet, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Text } from '../../primitives/Text';

export type JoinScheduleRowProps = {
  label: string;
};

export function JoinScheduleRow({ label }: JoinScheduleRowProps) {
  return (
    <View style={styles.row}>
      <Icon name="calendar" size="sm" tone="tertiary" />
      <Text variant="meta" tone="secondary" numberOfLines={1} style={styles.text}>
        {label}
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
