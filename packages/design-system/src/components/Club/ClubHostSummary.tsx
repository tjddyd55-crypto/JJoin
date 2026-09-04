import { StyleSheet, View } from 'react-native';
import { JoinHostAvatar } from '../JoinHostAvatar';
import { Text } from '../../primitives/Text';

export type ClubHostSummaryProps = {
  nickname: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
};

export function ClubHostSummary({ nickname, subtitle, avatarUrl }: ClubHostSummaryProps) {
  return (
    <View style={styles.row}>
      <JoinHostAvatar profileImageUrl={avatarUrl} hostName={nickname} size="sm" showHostBadge />
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {nickname}
        </Text>
        {subtitle ? (
          <Text variant="clubMeta" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  text: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
