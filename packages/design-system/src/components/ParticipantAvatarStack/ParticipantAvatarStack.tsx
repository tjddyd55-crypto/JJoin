import { StyleSheet, View } from 'react-native';
import { JoinHostAvatar } from '../JoinHostAvatar';
import { Text } from '../../primitives/Text';

export type ParticipantAvatarStackItem = {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
  isHost?: boolean;
};

export type ParticipantAvatarStackProps = {
  items: ParticipantAvatarStackItem[];
  maxVisible?: number;
};

export function ParticipantAvatarStack({ items, maxVisible = 5 }: ParticipantAvatarStackProps) {
  const visible = items.slice(0, maxVisible);
  if (visible.length === 0) return null;

  return (
    <View style={styles.row}>
      {visible.map((item) => (
        <View key={item.id} style={styles.item}>
          <JoinHostAvatar
            profileImageUrl={item.avatarUrl}
            hostName={item.nickname}
            size="md"
            showHostBadge={item.isHost}
          />
          <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.name}>
            {item.nickname}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    alignItems: 'center',
    width: 64,
    gap: 4,
  },
  name: {
    textAlign: 'center',
  },
});
