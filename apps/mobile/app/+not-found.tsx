import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** Bright Social Sports literals — no ThemeProvider (safe in expo-router outer slot). */
const COLORS = {
  background: '#F8F9F6',
  text: '#17212B',
  accent: '#66B83F',
};

/**
 * Unmatched route fallback.
 * expo-router handles +not-found automatically — do NOT register it in root Stack.
 */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '페이지 없음', headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>찾을 수 없는 화면입니다.</Text>
        <Link href="/(tabs)" asChild>
          <Pressable accessibilityRole="button">
            <Text style={styles.link}>홈으로 돌아가기</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
    paddingVertical: 8,
  },
});
