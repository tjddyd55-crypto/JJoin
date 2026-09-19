import { Stack } from 'expo-router';
import { useTheme } from '@jjoin/design-system';

export default function GiftLayout() {
  const theme = useTheme();
  const background = theme.colors.app.background;
  const title = theme.colors.text.primary;

  return (
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
      <Stack.Screen name="[userId]" options={{ title: '코인 선물' }} />
    </Stack>
  );
}
