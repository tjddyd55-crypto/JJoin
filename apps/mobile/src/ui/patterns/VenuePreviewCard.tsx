import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Card, Icon, Row, Stack, Text, useTheme } from '@jjoin/design-system';

export type VenuePreviewCardProps = {
  name: string;
  category?: string | null;
  distanceLabel?: string | null;
  address?: string | null;
  openJoinCount?: number;
  todayJoinCount?: number;
  ongoingJoinCount?: number;
  onPress?: () => void;
};

/** Compact venue header used inside bottom sheets. */
export function VenuePreviewCard({
  name,
  category,
  distanceLabel,
  address,
  openJoinCount = 0,
  todayJoinCount = 0,
  ongoingJoinCount = 0,
  onPress,
}: VenuePreviewCardProps) {
  const theme = useTheme();
  const activityLine = [
    ongoingJoinCount > 0 ? `진행 중 ${ongoingJoinCount}` : null,
    todayJoinCount > 0 ? `오늘 ${todayJoinCount}` : null,
    openJoinCount > 0 && todayJoinCount === 0 && ongoingJoinCount === 0
      ? `열린 조인 ${openJoinCount}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const content = (
    <View style={styles.root}>
      <Row gap="sm" align="flex-start">
        <Icon name="venue" size="lg" tone="gold" />
        <Stack gap="xxs" style={styles.textCol}>
          <Text variant="sectionTitle" tone="primary">
            {name}
          </Text>
          {category ? (
            <Text variant="meta" tone="secondary">
              {category}
            </Text>
          ) : null}
          <Text variant="meta" tone="tertiary">
            {[distanceLabel, address].filter(Boolean).join(' · ')}
          </Text>
          {activityLine ? (
            <Row gap="xs" align="center" style={styles.activityRow}>
              {ongoingJoinCount > 0 ? <Badge label="진행중" variant="gold" /> : null}
              {todayJoinCount > 0 && ongoingJoinCount === 0 ? (
                <Badge label="오늘" variant="neutral" />
              ) : null}
              <Text variant="bodyStrong" style={{ color: theme.colors.action.primary }}>
                {activityLine}
              </Text>
            </Row>
          ) : (
            <Text variant="bodyStrong" style={{ color: theme.colors.action.primary }}>
              열린 조인 0
            </Text>
          )}
        </Stack>
      </Row>
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  textCol: { flex: 1 },
  activityRow: { marginTop: 4, flexWrap: 'wrap' },
});
