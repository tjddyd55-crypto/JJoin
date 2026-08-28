import { StyleSheet, View } from 'react-native';
import { Card, Row, Spacer, Text, useTheme } from '@jjoin/design-system';
import type { MembershipPresentation } from '../../features/membership/membership-presentation';
import { MembershipBadge } from './MembershipBadge';

type MembershipSummaryCardProps = {
  presentation: MembershipPresentation;
};

export function MembershipSummaryCard({ presentation }: MembershipSummaryCardProps) {
  const theme = useTheme();
  return (
    <Card variant="elevated" padding="md">
      <Row align="center" gap="sm" style={styles.titleRow}>
        <Text variant="sectionTitle" tone="primary">
          {presentation.summaryTitle}
        </Text>
        <MembershipBadge presentation={presentation} />
      </Row>
      {presentation.periodLine ? (
        <>
          <Spacer size="xs" />
          <Text variant="meta" tone="secondary">
            {presentation.periodLine}
          </Text>
        </>
      ) : null}
      {presentation.benefitLines.length > 0 ? (
        <>
          <Spacer size="sm" />
          <View style={[styles.benefits, { gap: theme.spacing.xs }]}>
            {presentation.benefitLines.map((line) => (
              <Text key={line} variant="body" tone="secondary">
                {line}
              </Text>
            ))}
          </View>
        </>
      ) : null}
      {presentation.cancelNotice ? (
        <>
          <Spacer size="sm" />
          <Text variant="caption" tone="warning">
            {presentation.cancelNotice}
          </Text>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexWrap: 'wrap' },
  benefits: {},
});
