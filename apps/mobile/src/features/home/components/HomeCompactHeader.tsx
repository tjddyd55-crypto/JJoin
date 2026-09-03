import { Pressable, StyleSheet, View } from 'react-native';
import { BrandMark, IconButton, Text, spacing, useTheme } from '@jjoin/design-system';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';

type Props = {
  regionLabel: string;
  onPressNotifications: () => void;
  onPressRegion?: () => void;
};

export function HomeCompactHeader({
  regionLabel,
  onPressNotifications,
  onPressRegion,
}: Props) {
  const theme = useTheme();

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
      <IconButton
        icon="notification"
        accessibilityLabel="알림"
        variant="ghost"
        size="sm"
        onPress={onPressNotifications}
      />
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
});
