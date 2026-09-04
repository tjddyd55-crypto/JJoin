import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinDiscoveryAppBarProps = {
  title?: string;
  regionLabel: string;
  onRegionPress?: () => void;
  onNotificationPress?: () => void;
};

export function JoinDiscoveryAppBar({
  title = '조인',
  regionLabel,
  onRegionPress,
  onNotificationPress,
}: JoinDiscoveryAppBarProps) {
  const theme = useTheme();

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
          accessibilityLabel="알림"
          hitSlop={8}
          style={styles.notifyBtn}
        >
          <Text variant="joinTabLabel" tone="secondary">
            알림
          </Text>
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
  },
});
