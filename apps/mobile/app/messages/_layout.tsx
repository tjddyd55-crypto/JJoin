import { Stack } from 'expo-router';
import { useTheme } from '@jjoin/design-system';

export default function MessagesLayout() {
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
      <Stack.Screen name="index" options={{ title: '메시지' }} />
      <Stack.Screen name="[conversationId]" options={{ title: '대화' }} />
    </Stack>
  );
}
