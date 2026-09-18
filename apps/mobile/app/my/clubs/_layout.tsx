import { Redirect, Stack } from 'expo-router';
import { useTheme } from '@jjoin/design-system';
import { isClubsUiEnabled } from '../../../src/features/clubs/clubs-ui-gate';
import { useSession } from '../../../src/session/SessionContext';
import { StackHeaderBackButton } from '../../../src/ui/stack-header-back';

export default function ClubsLayout() {
  const theme = useTheme();
  const { me } = useSession();
  if (!isClubsUiEnabled(me?.featureFlags)) {
    return <Redirect href="/unavailable" />;
  }
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
      <Stack.Screen name="index" options={{ title: '내 동호회' }} />
      <Stack.Screen name="discover" options={{ title: '동호회' }} />
      <Stack.Screen name="create" options={{ title: '동호회 만들기' }} />
      <Stack.Screen name="[clubId]" options={{ headerShown: false }} />
    </Stack>
  );
}
