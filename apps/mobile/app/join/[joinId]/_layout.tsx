import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { useTheme } from '@jjoin/design-system';

export default function JoinDetailLayout() {
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
        <Stack.Screen name="index" options={{ title: '조인', headerShown: false }} />
        <Stack.Screen name="host-ops" options={{ title: '참석·정산 관리' }} />
        <Stack.Screen name="chat" options={{ title: '조인 채팅' }} />
        <Stack.Screen name="invite" options={{ title: '참가자 초대' }} />
      </Stack>
    </>
  );
}
