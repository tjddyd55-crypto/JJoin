import { StyleSheet, View } from 'react-native';
import { Button } from '../Button';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type ClubEmptyStateProps = {
  title: string;
  description?: string;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
};

export function ClubEmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
}: ClubEmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text variant="bodyStrong">{title}</Text>
      {description ? (
        <Text variant="clubIntro" tone="secondary">
          {description}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {primaryAction ? (
          <Button label={primaryAction.label} size="sm" onPress={primaryAction.onPress} />
        ) : null}
        {secondaryAction ? (
          <Button
            label={secondaryAction.label}
            size="sm"
            variant="secondary"
            onPress={secondaryAction.onPress}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
});
