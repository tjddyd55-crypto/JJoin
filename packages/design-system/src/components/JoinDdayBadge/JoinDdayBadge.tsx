import { View, StyleSheet } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinDdayBadgeProps = {
  label: string;
};

export function JoinDdayBadge({ label }: JoinDdayBadgeProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.join.dday.surface,
          borderRadius: theme.radius.full,
        },
      ]}
    >
      <Text
        variant="caption"
        style={[styles.label, { color: theme.colors.join.dday.text }]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
