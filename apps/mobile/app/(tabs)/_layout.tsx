import React from 'react';
import { Tabs } from 'expo-router';
import { colors } from '@jjoin/design-system';
import { t } from '@jjoin/i18n';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="explore" options={{ title: t('nav.explore') }} />
      <Tabs.Screen name="create" options={{ title: t('nav.create') }} />
      <Tabs.Screen name="my-joins" options={{ title: t('nav.myJoins') }} />
      <Tabs.Screen name="my" options={{ title: t('nav.my') }} />
    </Tabs>
  );
}
