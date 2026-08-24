import React from 'react';
import { Tabs } from 'expo-router';
import {
  BottomNavigation,
  ThemeProvider,
  clubMinimalTheme,
  type IconName,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';

const TAB_ICONS: Record<string, IconName> = {
  index: 'home',
  explore: 'map',
  create: 'create',
  'my-joins': 'calendar',
  my: 'profile',
};

const TAB_LABELS: Record<string, string> = {
  index: t('nav.home'),
  explore: t('nav.explore'),
  create: t('nav.create'),
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
  return (
    <BottomNavigation
      items={state.routes.map((route, index) => {
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
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          },
        };
      })}
    />
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider theme={clubMinimalTheme}>
      <Tabs
        tabBar={(props) => <ClubMinimalTabBar {...(props as Parameters<typeof ClubMinimalTabBar>[0])} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
        <Tabs.Screen name="explore" options={{ title: t('nav.explore') }} />
        <Tabs.Screen name="create" options={{ title: t('nav.create') }} />
        <Tabs.Screen name="my-joins" options={{ title: t('nav.myJoins') }} />
        <Tabs.Screen name="my" options={{ title: t('nav.my') }} />
      </Tabs>
    </ThemeProvider>
  );
}
