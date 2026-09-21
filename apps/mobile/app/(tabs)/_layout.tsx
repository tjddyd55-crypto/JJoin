import React from 'react';
import { Tabs } from 'expo-router';
import {
  BottomNavigation,
  ThemeProvider,
  clubMinimalTheme,
  type IconName,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import {
  resolveTabPressParams,
  shouldNavigateOnTabPress,
} from '../../src/features/explore/discovery/model/join-tab-press';

const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  joins: 'calendar',
  mall: 'coin',
  screen: 'golf',
  'my-joins': 'people',
  my: 'profile',
};

const TAB_LABELS: Record<string, string> = {
  index: t('nav.home'),
  joins: t('nav.join'),
  mall: '쪼인몰',
  screen: t('nav.screen'),
  'my-joins': t('nav.myJoins'),
  my: t('nav.my'),
};

/** Custom tab bar — typed loosely to avoid direct @react-navigation dependency. */
function ClubMinimalTabBar(props: {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: Record<string, unknown> }>;
  };
  navigation: {
    emit: (options: {
      type: 'tabPress';
      target: string;
      canPreventDefault: true;
    }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: Record<string, unknown>) => void;
  };
}) {
  const { state, navigation } = props;
  const visible = state.routes.filter(
    (route) => route.name !== 'create' && route.name !== 'explore',
  );
  return (
    <BottomNavigation
      items={visible.map((route) => {
        const index = state.routes.findIndex((r) => r.key === route.key);
        const focused = state.index === index;
        return {
          key: route.key,
          label: TAB_LABELS[route.name] ?? route.name,
          icon: TAB_ICONS[route.name] ?? 'home',
          active: focused,
          onPress: () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) return;
            if (!shouldNavigateOnTabPress(route.name, focused)) return;
            // 조인 탭은 항상 SCREEN으로 명시. route.params 재사용 시
            // 홈 FIELD 「전체보기」 leftover venueType이 그대로 남는다.
            navigation.navigate(route.name, resolveTabPressParams(route));
          },
        };
      })}
    />
  );
}

export default function TabLayout() {
  if (__DEV__) {
    console.log('[BOOT 08] tabs route render');
  }

  return (
    <ThemeProvider theme={clubMinimalTheme}>
      <Tabs
        tabBar={(props) => <ClubMinimalTabBar {...(props as Parameters<typeof ClubMinimalTabBar>[0])} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
        <Tabs.Screen name="joins" options={{ title: t('nav.join') }} />
        <Tabs.Screen name="mall" options={{ title: '쪼인몰' }} />
        <Tabs.Screen name="screen" options={{ title: t('nav.screen') }} />
        <Tabs.Screen name="my-joins" options={{ title: t('nav.myJoins') }} />
        <Tabs.Screen name="my" options={{ title: t('nav.my') }} />
        {/* Hidden routes — keep for deep links / create flow */}
        <Tabs.Screen name="create" options={{ href: null, title: t('nav.create') }} />
        <Tabs.Screen name="explore" options={{ href: null, title: t('nav.explore') }} />
      </Tabs>
    </ThemeProvider>
  );
}
