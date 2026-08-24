import { StyleSheet, View } from 'react-native';
import { Row, Text, useTheme } from '@jjoin/design-system';

type OnboardingHeaderProps = {
  step: number;
  totalSteps?: number;
  title: string;
  description?: string;
};

export function OnboardingHeader({
  step,
  totalSteps = 4,
  title,
  description,
}: OnboardingHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <Row gap="xs">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={`step-${index + 1}`}
            style={[
              styles.progress,
              {
                backgroundColor:
                  index < step
                    ? theme.colors.action.primary
                    : theme.colors.surface.elevated,
                borderRadius: theme.radius.full,
              },
            ]}
          />
        ))}
      </Row>
      <Text variant="meta" tone="tertiary">
        STEP {step} / {totalSteps}
      </Text>
      <Text variant="headline" tone="primary">
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="secondary">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    marginBottom: 24,
  },
  progress: {
    flex: 1,
    height: 4,
  },
});

