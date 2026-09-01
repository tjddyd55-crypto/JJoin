import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@jjoin/design-system';

type Props = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function HomeSectionHeader({ title, actionLabel, onActionPress }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text variant="sectionTitle" tone="primary" style={[styles.title, { color: theme.colors.text.primary }]}>
        {title}
      </Text>
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          hitSlop={8}
        >
          <Text variant="caption" style={{ color: theme.colors.text.tertiary }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
  },
});
