import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Icon, Text, spacing, useTheme } from '@jjoin/design-system';
import type { IconName, IconTone } from '@jjoin/design-system';

type HomeMenuItem = {
  label: string;
  description: string;
  icon: IconName;
  href: Href;
  iconTone?: IconTone;
};

const HOME_MENU_ITEMS: HomeMenuItem[] = [
  {
    label: '필드 쪼인',
    description: '필드 라운드 찾기',
    icon: 'golf',
    href: { pathname: '/(tabs)/joins', params: { venueType: 'FIELD' } } as Href,
  },
  {
    label: '스크린 쪼인',
    description: '스크린 쪼인 찾기',
    icon: 'venue',
    href: { pathname: '/(tabs)/joins', params: { venueType: 'SCREEN' } } as Href,
  },
  {
    label: '쪼인 후기',
    description: '작성 가능 · 내가 쓴 후기',
    icon: 'edit',
    href: '/my/join-session-reviews' as Href,
  },
  {
    label: '쪼인몰',
    description: '코인으로 상품 구매',
    icon: 'coin',
    href: '/(tabs)/mall' as Href,
  },
  {
    label: '골프친구',
    description: '함께할 골퍼 찾기',
    icon: 'people',
    href: '/my/golf-friends' as Href,
  },
  {
    label: '스크린 매장',
    description: '주변 매장 찾기',
    icon: 'location',
    href: '/stores' as Href,
  },
  {
    label: '내 쪼인',
    description: '참여 · 개설 내역',
    icon: 'calendar',
    href: '/(tabs)/my-joins' as Href,
  },
  {
    label: '코인',
    description: '충전 · 사용 내역',
    icon: 'wallet',
    href: '/my/wallet' as Href,
  },
];

function HomeMenuCard({ item }: { item: HomeMenuItem }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={() => router.push(item.href)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface.elevated,
          borderColor: theme.colors.border.subtle,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconPlate,
          {
            backgroundColor: theme.colors.surface.soft,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Icon name={item.icon} size="md" tone={item.iconTone ?? 'primary'} />
      </View>

      <View style={styles.copy}>
        <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
          {item.label}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Home is a navigation hub: one large two-column card per destination.
 * Review creation is intentionally not duplicated; "쪼인 후기" opens the review hub.
 */
export function HomeQuickMenu() {
  const rows: HomeMenuItem[][] = [];
  for (let index = 0; index < HOME_MENU_ITEMS.length; index += 2) {
    rows.push(HOME_MENU_ITEMS.slice(index, index + 2));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0]?.label} style={styles.row}>
          {row.map((item) => (
            <HomeMenuCard key={item.label} item={item} />
          ))}
          {row.length === 1 ? <View style={styles.cardSpacer} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 116,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  cardSpacer: {
    flex: 1,
  },
  iconPlate: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: 3,
  },
});
