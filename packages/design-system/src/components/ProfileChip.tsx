import { Pressable, StyleSheet, View } from 'react-native';
import { UserAvatar } from './UserAvatar';
import { AppText } from '../primitives/AppText';
import { StatusBadge } from './StatusBadge';
import { spacing, sizing } from '../tokens';

type Props = {
  name: string;
  avatarUrl?: string | null;
  verified?: boolean;
  onPress?: () => void;
};

export function ProfileChip({ name, avatarUrl, verified, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name} 프로필`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <UserAvatar uri={avatarUrl} name={name} size="sm" />
      <View style={styles.meta}>
        <AppText variant="bodyStrong">{name}</AppText>
        {verified ? <StatusBadge label="본인확인" tone="success" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizing.touchTarget,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
});
