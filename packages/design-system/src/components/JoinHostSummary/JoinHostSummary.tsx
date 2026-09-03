import { Pressable, StyleSheet, View } from 'react-native';
import { JoinHostAvatar } from '../JoinHostAvatar';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';
import { shadows } from '../../tokens';

export type JoinHostSummaryProps = {
  nickname: string;
  avatarUrl?: string | null;
  verified?: boolean;
  metaLine?: string | null;
  onPress?: () => void;
  /** When true, renders as a row inside a parent section card (no outer border/shadow). */
  embedded?: boolean;
};

export function JoinHostSummary({
  nickname,
  avatarUrl,
  metaLine,
  onPress,
  embedded = false,
}: JoinHostSummaryProps) {
  const theme = useTheme();
  const inner = (
    <View
      style={[
        styles.card,
        embedded ? styles.embedded : null,
        !embedded
          ? {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
              borderRadius: theme.radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
            }
          : null,
        !embedded ? shadows.card : null,
      ]}
    >
      <JoinHostAvatar
        profileImageUrl={avatarUrl}
        hostName={nickname}
        size="lg"
        showHostBadge
      />
      <View style={styles.textCol}>
        <Text variant="sectionTitle" tone="primary" numberOfLines={1} style={styles.name}>
          {`${nickname} · 방장`}
        </Text>
        {metaLine ? (
          <Text variant="meta" tone="secondary" numberOfLines={2} style={styles.meta}>
            {metaLine}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.pressable}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 0,
  },
  embedded: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  textCol: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  name: {
    fontSize: 18,
    lineHeight: 24,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
  },
  pressable: {
    minHeight: 44,
  },
});
