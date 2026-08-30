import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@jjoin/design-system';

export default function MyLayout() {
  const theme = useTheme();
  const background = theme.colors.app.background;
  const title = theme.colors.text.primary;

  return (
    <>
      <StatusBar style="light" />
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
        <Stack.Screen name="create-store-join" options={{ title: '모집 조인 만들기' }} />
        <Stack.Screen name="wallet" options={{ title: '월렛' }} />
        <Stack.Screen name="edit-profile" options={{ title: '프로필 수정' }} />
        <Stack.Screen name="account" options={{ title: '계정' }} />
        <Stack.Screen name="notifications" options={{ title: '알림' }} />
      </Stack>
    </>
  );
}
