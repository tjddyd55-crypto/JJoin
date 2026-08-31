import { StyleSheet, View } from 'react-native';
import { Badge, Card, Icon, Row, Text, useTheme } from '@jjoin/design-system';
import { formatCoinWithLabel } from '@jjoin/domain';

export type JoinCardProps = {
  sport?: string;
  distance?: string | null;
  venue: string;
  startAt: string;
  participantCount: number;
  plannedPlayerCount: number;
  host: string;
  hostVerified?: boolean;
  rewardPerParticipant: string | number;
  status?: string | null;
  /** Urgent vacancy flag — compact gold badge, not alarm red. */
  isUrgent?: boolean;
  onPress?: () => void;
};

export function JoinCard({
  sport,
  distance,
  venue,
  startAt,
  participantCount,
  plannedPlayerCount,
  host,
  hostVerified,
  rewardPerParticipant,
  status,
  isUrgent,
  onPress,
}: JoinCardProps) {
  const theme = useTheme();

  return (
    <Card variant="interactive" padding="md" onPress={onPress}>
      <View style={styles.top}>
        <Row gap="xs" align="center" style={styles.meta}>
          {sport ? <Badge label={sport} variant="gold" /> : null}
          {isUrgent ? <Badge label="긴급" variant="warning" /> : null}
          {distance ? (
            <Text variant="caption" tone="tertiary">
              {distance}
            </Text>
          ) : null}
          {status ? <Badge label={status} variant="neutral" /> : null}
        </Row>
        <Text variant="venueTitle" tone="primary" numberOfLines={1}>
          {venue}
        </Text>
        <Row gap="xs" align="center">
          <Icon name="calendar" size="sm" tone="tertiary" />
          <Text variant="meta" tone="secondary">
            {startAt}
          </Text>
        </Row>
        <Row gap="xs" align="center">
          <Icon name="people" size="sm" tone="tertiary" />
          <Text variant="meta" tone="secondary">
            {participantCount}/{plannedPlayerCount}명 · {host}
            {hostVerified ? ' · 인증' : ''}
          </Text>
        </Row>
      </View>
      <Row
        justify="space-between"
        align="center"
        style={[styles.reward, { borderTopColor: theme.colors.border.subtle }]}
      >
        <Text variant="meta" tone="tertiary">
          1인 보상
        </Text>
        <Text variant="bodyStrong" style={{ color: theme.colors.reward.primary }}>
          {formatCoinWithLabel(rewardPerParticipant)}
        </Text>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { gap: 8 },
  meta: { flexWrap: 'wrap' },
  reward: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
