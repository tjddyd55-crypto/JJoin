import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Icon, Text, spacing, useTheme } from '@jjoin/design-system';
import type { IconName } from '@jjoin/design-system';

type HomeMenuVisual =
  | 'field'
  | 'screen'
  | 'review'
  | 'mall'
  | 'friends'
  | 'store'
  | 'myJoins'
  | 'coin';

type HomeMenuItem = {
  label: string;
  description: string;
  icon: IconName;
  href: Href;
  visual: HomeMenuVisual;
};

const HOME_MENU_ITEMS: HomeMenuItem[] = [
  {
    label: '필드 쪼인',
    description: '필드 라운드 찾기',
    icon: 'golf',
    href: { pathname: '/(tabs)/joins', params: { venueType: 'FIELD' } } as Href,
    visual: 'field',
  },
  {
    label: '스크린 쪼인',
    description: '스크린 쪼인 찾기',
    icon: 'venue',
    href: { pathname: '/(tabs)/joins', params: { venueType: 'SCREEN' } } as Href,
    visual: 'screen',
  },
  {
    label: '쪼인 후기',
    description: '작성 가능 · 내가 쓴 후기',
    icon: 'edit',
    href: '/my/join-session-reviews' as Href,
    visual: 'review',
  },
  {
    label: '쪼인몰',
    description: '코인으로 상품 구매',
    icon: 'coin',
    href: '/(tabs)/mall' as Href,
    visual: 'mall',
  },
  {
    label: '골프친구',
    description: '함께할 골퍼 찾기',
    icon: 'people',
    href: '/my/golf-friends' as Href,
    visual: 'friends',
  },
  {
    label: '스크린 매장',
    description: '주변 매장 찾기',
    icon: 'location',
    href: '/stores' as Href,
    visual: 'store',
  },
  {
    label: '내 쪼인',
    description: '참여 · 개설 내역',
    icon: 'calendar',
    href: '/(tabs)/my-joins' as Href,
    visual: 'myJoins',
  },
  {
    label: '코인',
    description: '충전 · 사용 내역',
    icon: 'wallet',
    href: '/my/wallet' as Href,
    visual: 'coin',
  },
];

function HomeMenuCard({ item }: { item: HomeMenuItem }) {
  const theme = useTheme();
  const router = useRouter();

  const visual = (() => {
    switch (item.visual) {
      case 'field':
        return {
          background: theme.colors.join.surface.success,
          icon: theme.colors.state.active,
          border: theme.colors.state.selectedBorder,
          decoration: theme.colors.reward.muted,
        };
      case 'screen':
        return {
          background: theme.colors.map.accentSoft,
          icon: theme.colors.map.accent,
          border: theme.colors.map.accent,
          decoration: theme.colors.status.infoSoft,
        };
      case 'review':
        return {
          background: theme.colors.status.warningSoft,
          icon: theme.colors.status.warning,
          border: theme.colors.status.warning,
          decoration: theme.colors.status.warningSoft,
        };
      case 'mall':
        return {
          background: theme.colors.state.selectedSurface,
          icon: theme.colors.brand.limeAccent,
          border: theme.colors.brand.limeAccent,
          decoration: theme.colors.reward.muted,
        };
      case 'friends':
        return {
          background: theme.colors.surface.elevated,
          icon: theme.colors.action.primary,
          border: theme.colors.border.subtle,
          decoration: theme.colors.state.selectedSurface,
        };
      case 'store':
        return {
          background: theme.colors.status.infoSoft,
          icon: theme.colors.action.info,
          border: theme.colors.status.info,
          decoration: theme.colors.map.accentSoft,
        };
      case 'myJoins':
        return {
          background: theme.colors.surface.soft,
          icon: theme.colors.action.primary,
          border: theme.colors.border.subtle,
          decoration: theme.colors.status.warningSoft,
        };
      case 'coin':
        return {
          background: theme.colors.reward.light,
          icon: theme.colors.reward.primary,
          border: theme.colors.reward.primary,
          decoration: theme.colors.reward.muted,
        };
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={() => router.push(item.href)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: visual.background,
          borderColor: visual.border,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.decorativeCircle,
          { backgroundColor: visual.decoration },
        ]}
      />

      <View style={styles.topRow}>
        <View
          style={[
            styles.iconPlate,
            {
              backgroundColor: visual.icon,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Icon name={item.icon} size="md" tone="inverse" />
        </View>

        <View style={styles.chevron}>
          <Icon name="chevronRight" size="sm" tone="secondary" />
        </View>
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
    minHeight: 124,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: spacing.sm,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardSpacer: {
    flex: 1,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    right: -24,
    top: -24,
  },
  topRow: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconPlate: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    zIndex: 1,
    gap: 4,
  },
});
