import { Stack } from 'expo-router';
import { useTheme } from '@jjoin/design-system';

export default function ClubsLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.app.background },
        headerTintColor: theme.colors.text.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.app.background },
      }}
    />
  );
}
