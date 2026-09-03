import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Icon, Text, spacing, useTheme } from '@jjoin/design-system';
import type { IconName } from '@jjoin/design-system';

type QuickItem = {
  label: string;
  icon: IconName;
  href: Href;
  iconTone: 'primary' | 'secondary' | 'gold';
};

const ITEMS: QuickItem[] = [
  { label: '조인 찾기', icon: 'search', href: '/(tabs)/joins', iconTone: 'primary' },
  { label: '지역별', icon: 'map', href: '/(tabs)/joins', iconTone: 'secondary' },
  { label: '지도에서 보기', icon: 'currentLocation', href: '/(tabs)/screen', iconTone: 'secondary' },
  { label: '스크린', icon: 'golf', href: '/(tabs)/screen', iconTone: 'secondary' },
];

export function HomeQuickMenu() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      {ITEMS.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => router.push(item.href)}
          style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.88 : 1 }]}
        >
          <View
            style={[
              styles.tile,
              {
                backgroundColor: theme.colors.surface.elevated,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Icon name={item.icon} size="md" tone={item.iconTone} />
          </View>
          <Text variant="quickMenuLabel" tone="secondary" style={styles.label} numberOfLines={2}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const TILE = 44;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
    minHeight: 44,
  },
  tile: {
    width: TILE,
    height: TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
