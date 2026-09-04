import { Pressable, StyleSheet } from 'react-native';
import { Card, Text } from '@jjoin/design-system';

type Props = {
  title: string;
  startsAt: string;
  venueName: string;
  attendingCount: number;
  capacity: number | null;
  onPress?: () => void;
};

function formatEventMeta(startsAt: string, venueName: string, attendingCount: number, capacity: number | null) {
  const date = new Date(startsAt);
  const dateLine = date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
  const timeLine = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const capacityLine = capacity != null ? `${attendingCount}/${capacity}명` : `${attendingCount}명 참가`;
  return { dateLine, timeLine, capacityLine, venueName };
}

export function ClubEventRow({ title, startsAt, venueName, attendingCount, capacity, onPress }: Props) {
  const meta = formatEventMeta(startsAt, venueName, attendingCount, capacity);
  const card = (
    <Card padding="md" variant={onPress ? 'interactive' : 'base'}>
      <Text variant="bodyStrong">{title}</Text>
      <Text variant="clubMeta" tone="secondary" style={styles.line}>
        {meta.dateLine} · {meta.timeLine}
      </Text>
      <Text variant="clubMeta" tone="tertiary">
        {meta.venueName} · {meta.capacityLine}
      </Text>
    </Card>
  );

  if (!onPress) return card;
  return <Pressable onPress={onPress}>{card}</Pressable>;
}

const styles = StyleSheet.create({
  line: {
    marginTop: 4,
  },
});
