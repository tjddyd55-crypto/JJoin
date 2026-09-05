import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinDiscoveryAppBarProps = {
  title?: string;
  regionLabel: string;
  unreadCount?: number;
  onRegionPress?: () => void;
  onNotificationPress?: () => void;
};

function formatUnreadBadge(count: number): string {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

export function JoinDiscoveryAppBar({
  title = '조인',
  regionLabel,
  unreadCount = 0,
  onRegionPress,
  onNotificationPress,
}: JoinDiscoveryAppBarProps) {
  const theme = useTheme();
  const badgeLabel = formatUnreadBadge(unreadCount);

  return (
    <View style={styles.bar}>
      <Text variant="joinScreenTitle" tone="primary" style={styles.title}>
        {title}
      </Text>
      <View style={styles.trailing}>
        <Pressable
          onPress={onRegionPress}
          accessibilityRole="button"
          accessibilityLabel={`지역 ${regionLabel}`}
          style={[
            styles.regionChip,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
            },
          ]}
        >
          <Text variant="joinTabLabel" tone="primary" numberOfLines={1}>
            {regionLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={onNotificationPress}
          accessibilityRole="button"
          accessibilityLabel={badgeLabel ? `알림, 읽지 않음 ${badgeLabel}개` : '알림'}
          hitSlop={8}
          style={styles.notifyBtn}
        >
          <Text variant="joinTabLabel" tone="secondary">
            알림
          </Text>
          {badgeLabel ? (
            <View
              style={[
                styles.unreadBadge,
                {
                  backgroundColor: theme.colors.status.error,
                  borderColor: theme.colors.surface.base,
                },
              ]}
            >
              <Text variant="caption" tone="inverse" style={styles.unreadBadgeText}>
                {badgeLabel}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 16,
    gap: 12,
  },
  title: {
    flexShrink: 0,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  regionChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 140,
  },
  notifyBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});
