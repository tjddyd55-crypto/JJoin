import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../../primitives/Text';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text variant="sectionTitle" tone="primary" style={styles.title}>
        {title}
      </Text>
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          hitSlop={8}
          style={styles.action}
        >
          <Text variant="meta" tone="link">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 28,
  },
  title: {
    flex: 1,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
