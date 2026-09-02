import { Stack } from 'expo-router';
import { useTheme } from '@jjoin/design-system';
import { StackHeaderBackButton } from '../../../src/ui/stack-header-back';

export default function ClubsLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.app.background },
        headerTintColor: theme.colors.text.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.app.background },
        headerLeft: () => <StackHeaderBackButton navigation={navigation} />,
      })}
    >
      <Stack.Screen name="index" options={{ title: '동호회' }} />
      <Stack.Screen name="discover" options={{ title: '동호회 찾기' }} />
      <Stack.Screen name="create" options={{ title: '동호회 만들기' }} />
      <Stack.Screen name="[clubId]" options={{ headerShown: false }} />
    </Stack>
  );
}
