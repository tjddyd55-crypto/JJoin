import { Pressable, StyleSheet, View } from 'react-native';
import { BrandMark, IconButton, Text, spacing, useTheme } from '@jjoin/design-system';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';

type Props = {
  regionLabel: string;
  unreadCount?: number;
  onPressNotifications: () => void;
  onPressRegion?: () => void;
};

function formatUnreadBadge(count: number): string {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

export function HomeCompactHeader({
  regionLabel,
  unreadCount = 0,
  onPressNotifications,
  onPressRegion,
}: Props) {
  const theme = useTheme();
  const badgeLabel = formatUnreadBadge(unreadCount);

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <BrandMark
          variant="compactHeader"
          showDevBadge={isInternalToolsEnabled()}
        />
        <Pressable
          onPress={onPressRegion}
          disabled={!onPressRegion}
          accessibilityRole={onPressRegion ? 'button' : 'text'}
          accessibilityLabel={`위치 ${regionLabel}`}
          style={[
            styles.regionChip,
            {
              borderColor: theme.colors.border.subtle,
              backgroundColor: theme.colors.surface.card,
              borderRadius: theme.radius.full,
            },
          ]}
        >
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {regionLabel}
          </Text>
        </Pressable>
      </View>
      <View style={styles.notifyWrap}>
        <IconButton
          icon="notification"
          accessibilityLabel={badgeLabel ? `알림, 읽지 않음 ${badgeLabel}개` : '알림'}
          variant="ghost"
          size="sm"
          onPress={onPressNotifications}
        />
        {badgeLabel ? (
          <View
            style={[
              styles.unreadBadge,
              {
                backgroundColor: theme.colors.status.error,
                borderColor: theme.colors.surface.base,
              },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text variant="caption" tone="inverse" style={styles.unreadBadgeText}>
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginBottom: spacing.xs,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  regionChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 120,
  },
  notifyWrap: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
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
