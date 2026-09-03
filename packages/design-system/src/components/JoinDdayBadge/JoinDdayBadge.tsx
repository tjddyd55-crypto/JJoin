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
          borderRadius: theme.radius.sm,
        },
      ]}
    >
      <Text variant="caption" tone="primary" style={{ color: theme.colors.join.dday.text }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
