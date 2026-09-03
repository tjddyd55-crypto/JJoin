import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Icon, Text, spacing, useTheme } from '@jjoin/design-system';
import type { IconName } from '@jjoin/design-system';

type QuickMenuItem = {
  label: string;
  icon: IconName;
  href: Href;
  accent?: boolean;
};

const ROW_1: QuickMenuItem[] = [
  { label: '조인 찾기', icon: 'search', href: '/(tabs)/joins' },
  { label: '조인 만들기', icon: 'create', href: '/(tabs)/create' },
  { label: '스크린', icon: 'golf', href: '/(tabs)/screen' },
  { label: '동호회', icon: 'people', href: '/my/clubs' as Href },
];

const ROW_2: QuickMenuItem[] = [
  { label: '내 조인', icon: 'people', href: '/(tabs)/my-joins' },
  { label: '긴급 모집', icon: 'warning', href: '/(tabs)/joins', accent: true },
  { label: '알림', icon: 'notification', href: '/my/notifications' },
  { label: '코인', icon: 'coin', href: '/my/wallet' },
];

function QuickMenuCell({ item }: { item: QuickMenuItem }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
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
            borderColor: item.accent ? theme.colors.state.active : 'transparent',
            borderWidth: item.accent ? 1 : 0,
          },
        ]}
      >
        <Icon
          name={item.icon}
          size="md"
          tone={item.accent ? 'gold' : 'primary'}
        />
      </View>
      <Text
        variant="caption"
        tone={item.accent ? 'success' : 'secondary'}
        style={styles.label}
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function HomeQuickMenu() {
  return (
    <View style={styles.grid}>
      {[ROW_1, ROW_2].map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item) => (
            <QuickMenuCell key={item.label} item={item} />
          ))}
        </View>
      ))}
    </View>
  );
}

const TILE = 48;

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 0,
  },
  tile: {
    width: TILE,
    height: TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '500',
  },
});
