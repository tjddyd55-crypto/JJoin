import { StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Button, ScrollScreenFrame, Text, spacing } from '@jjoin/design-system';

export default function UnavailableScreen() {
  const router = useRouter();
  return (
    <ScrollScreenFrame>
      <Stack.Screen options={{ title: '이용 불가' }} />
      <View style={styles.wrap}>
        <Text variant="screenTitle">이 기능은 현재 이용할 수 없습니다</Text>
        <Text variant="body" tone="secondary">
          요청하신 화면은 숨겨져 있거나 더 이상 사용자 앱에서 열리지 않습니다.
        </Text>
        <Button label="홈으로" onPress={() => router.replace('/(tabs)')} />
      </View>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
});
