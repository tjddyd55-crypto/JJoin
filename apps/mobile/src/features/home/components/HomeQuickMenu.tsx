import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Icon, Text, spacing, useTheme } from '@jjoin/design-system';
import type { IconName, IconTone } from '@jjoin/design-system';

type QuickMenuItem = {
  label: string;
  icon: IconName;
  href: Href;
  iconTone?: IconTone;
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
  { label: '긴급 모집', icon: 'warning', href: '/(tabs)/joins', accent: true, iconTone: 'gold' },
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
            borderWidth: item.accent ? StyleSheet.hairlineWidth : 0,
          },
        ]}
      >
        <Icon
          name={item.icon}
          size="md"
          tone={item.iconTone ?? 'primary'}
        />
      </View>
      <Text
        variant="quickMenuLabel"
        tone={item.accent ? 'success' : 'secondary'}
        style={styles.label}
        numberOfLines={1}
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

const TILE = 50;

const styles = StyleSheet.create({
  grid: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    minHeight: 44,
    paddingVertical: 2,
  },
  tile: {
    width: TILE,
    height: TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
    maxWidth: '100%',
  },
});
