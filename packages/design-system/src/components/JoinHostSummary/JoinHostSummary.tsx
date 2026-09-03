import { Pressable, StyleSheet, View } from 'react-native';
import { JoinHostAvatar } from '../JoinHostAvatar';
import { JoinStatusBadge } from '../JoinStatusBadge';
import { Text } from '../../primitives/Text';
import { Row } from '../../primitives/Row';

export type JoinHostSummaryProps = {
  nickname: string;
  avatarUrl?: string | null;
  verified?: boolean;
  metaLine?: string | null;
  onPress?: () => void;
};

export function JoinHostSummary({
  nickname,
  avatarUrl,
  verified,
  metaLine,
  onPress,
}: JoinHostSummaryProps) {
  const inner = (
    <Row gap="md" align="center" style={styles.row}>
      <JoinHostAvatar profileImageUrl={avatarUrl} hostName={nickname} size="lg" showHostBadge />
      <View style={styles.textCol}>
        <Row gap="xs" align="center">
          <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
            {nickname}
          </Text>
          {verified ? <JoinStatusBadge label="인증" tone="open" /> : null}
        </Row>
        {metaLine ? (
          <Text variant="meta" tone="secondary" numberOfLines={2}>
            {metaLine}
          </Text>
        ) : null}
      </View>
    </Row>
  );

  if (!onPress) return inner;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.pressable}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minWidth: 0,
  },
  textCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  pressable: {
    minHeight: 44,
  },
});
