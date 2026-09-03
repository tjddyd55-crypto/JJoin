import { Pressable, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../primitives/Text';
import { Icon } from '../../icons/Icon';
import type { IconName } from '../../icons/iconTypes';
import { useTheme } from '../../theme';

export type BottomNavItem = {
  key: string;
  label: string;
  icon: IconName;
  active?: boolean;
  onPress: () => void;
};

export type BottomNavigationProps = {
  items: BottomNavItem[];
};

export function BottomNavigation({ items }: BottomNavigationProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface.base,
          borderTopColor: theme.colors.border.subtle,
          paddingBottom: Math.max(insets.bottom, theme.spacing.xs),
          minHeight: theme.sizes.bottomNav + insets.bottom,
        },
      ]}
    >
      {items.map((item) => {
        const active = item.active;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={item.onPress}
            style={styles.item}
          >
            <Icon name={item.icon} size="md" tone={active ? 'primary' : 'tertiary'} />
            <Text variant="navLabel" tone={active ? 'primary' : 'tertiary'} style={active ? { color: theme.colors.navigation.active } : undefined}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
  },
});
