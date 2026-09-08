import { Stack } from 'expo-router';

export default function MallLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[productId]" />
      <Stack.Screen name="orders" />
    </Stack>
  );
}
