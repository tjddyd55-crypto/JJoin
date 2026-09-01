import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { useTheme } from '@jjoin/design-system';

export default function MyLayout() {
  const theme = useTheme();
  const background = theme.colors.app.background;
  const title = theme.colors.text.primary;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={background} />
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: background },
          headerTintColor: title,
          headerTitleStyle: { color: title, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: background },
        }}
      >
        <Stack.Screen name="store-verification" options={{ title: '스크린골프 매장 인증' }} />
        <Stack.Screen name="stores" options={{ title: '내 매장' }} />
        <Stack.Screen name="store-dashboard" options={{ title: '운영 대시보드' }} />
        <Stack.Screen name="create-store-join" options={{ title: '모집 조인 만들기' }} />
        <Stack.Screen name="recurring-joins" options={{ title: '정기 조인' }} />
        <Stack.Screen name="create-recurring-join" options={{ title: '정기 조인 만들기' }} />
        <Stack.Screen name="join-alerts" options={{ title: '조인 알림' }} />
        <Stack.Screen name="bookmarks" options={{ title: '찜한 조인' }} />
        <Stack.Screen name="followed-stores" options={{ title: '팔로우한 매장' }} />
        <Stack.Screen name="played-together" options={{ title: '함께 친 사람' }} />
        <Stack.Screen name="wallet" options={{ title: '월렛' }} />
        <Stack.Screen name="edit-profile" options={{ title: '프로필 수정' }} />
        <Stack.Screen name="account" options={{ title: '계정' }} />
        <Stack.Screen name="notifications" options={{ title: '알림' }} />
        <Stack.Screen name="notification-settings" options={{ title: '알림 설정' }} />
        <Stack.Screen name="clubs" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
