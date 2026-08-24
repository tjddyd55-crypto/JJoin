import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { Text } from '../../primitives/Text';
import { IconButton } from '../IconButton';
import { useTheme } from '../../theme';

export type AppBarProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  leftAction?: ReactNode;
  rightActions?: ReactNode;
  showBack?: boolean;
};

export function AppBar({
  title,
  subtitle,
  onBack,
  leftAction,
  rightActions,
  showBack = Boolean(onBack),
}: AppBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: insets.top,
          minHeight: theme.sizes.appBar + insets.top,
          backgroundColor: theme.colors.app.background,
          paddingHorizontal: theme.layoutSpacing.screenHorizontal,
        },
      ]}
    >
      <View style={styles.side}>
        {leftAction ??
          (showBack && onBack ? (
            <IconButton icon="back" accessibilityLabel="뒤로" onPress={onBack} />
          ) : (
            <View style={styles.sidePlaceholder} />
          ))}
      </View>
      <View style={styles.center}>
        <Text variant="screenTitle" tone="primary" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>{rightActions ?? <View style={styles.sidePlaceholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: { width: 48, alignItems: 'flex-start' },
  right: { alignItems: 'flex-end' },
  sidePlaceholder: { width: 44, height: 44 },
  center: { flex: 1, alignItems: 'center', gap: 2 },
});
