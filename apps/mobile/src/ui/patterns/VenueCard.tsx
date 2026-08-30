import { StyleSheet, View } from 'react-native';
import { Badge, Card, Icon, Row, Text } from '@jjoin/design-system';

export type VenueCardProps = {
  name: string;
  category?: string | null;
  distance?: string | null;
  regionLabel?: string | null;
  openJoinCount?: number;
  todayJoinableCount?: number;
  onPress?: () => void;
};

export function VenueCard({
  name,
  category,
  distance,
  regionLabel,
  openJoinCount = 0,
  todayJoinableCount = 0,
  onPress,
}: VenueCardProps) {
  const badgeLabel =
    todayJoinableCount > 0
      ? `오늘 ${todayJoinableCount}개 모집 중`
      : openJoinCount > 0
        ? `조인 ${openJoinCount}`
        : null;

  return (
    <Card variant="interactive" padding="md" onPress={onPress}>
      <Row gap="sm" align="center">
        <Icon name="golf" size="md" tone="gold" />
        <View style={styles.body}>
          <Text variant="venueTitle" tone="primary" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="meta" tone="secondary" numberOfLines={1}>
            {[distance, regionLabel, category].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {badgeLabel ? (
          <Badge label={badgeLabel} variant={todayJoinableCount > 0 ? 'gold' : 'neutral'} />
        ) : null}
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: 2 },
});
