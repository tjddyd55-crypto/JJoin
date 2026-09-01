import { Stack } from 'expo-router';
import { useTheme } from '@jjoin/design-system';

export default function ClubDetailLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.app.background },
        headerTintColor: theme.colors.text.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.app.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: '동호회 홈' }} />
      <Stack.Screen name="edit" options={{ title: '동호회 정보 수정' }} />
      <Stack.Screen name="members" options={{ title: '회원' }} />
      <Stack.Screen name="members/[userId]" options={{ title: '회원 통계' }} />
      <Stack.Screen name="accounting" options={{ title: '회계' }} />
      <Stack.Screen name="notices" options={{ title: '공지' }} />
      <Stack.Screen name="events/index" options={{ title: '모임' }} />
      <Stack.Screen name="events/create" options={{ title: '모임 만들기' }} />
      <Stack.Screen name="events/[eventId]" options={{ title: '모임 상세' }} />
    </Stack>
  );
}
