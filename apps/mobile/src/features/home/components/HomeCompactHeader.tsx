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
          variant="compact"
          showDevBadge={isInternalToolsEnabled()}
          style={styles.mark}
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
          <Text variant="meta" tone="secondary" numberOfLines={1}>
            {regionLabel}
          </Text>
        </Pressable>
      </View>
      <IconButton
        icon="notification"
        accessibilityLabel="알림"
        variant="ghost"
        size="md"
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
    minHeight: 56,
    marginBottom: spacing.xs,
  },
  left: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  mark: {
    maxHeight: 28,
  },
  regionChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
});
