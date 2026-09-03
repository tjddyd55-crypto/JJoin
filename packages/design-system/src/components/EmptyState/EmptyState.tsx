import { StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface.elevated,
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <Text variant="bodyStrong" tone="primary">
        {title}
      </Text>
      {description ? (
        <Text variant="meta" tone="secondary">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
