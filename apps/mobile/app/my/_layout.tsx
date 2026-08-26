import { Stack } from 'expo-router';

export default function MyLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="store-verification" options={{ title: '스크린골프 매장 인증' }} />
      <Stack.Screen name="stores" options={{ title: '내 매장' }} />
      <Stack.Screen name="create-store-join" options={{ title: '모집 조인 만들기' }} />
    </Stack>
  );
}
