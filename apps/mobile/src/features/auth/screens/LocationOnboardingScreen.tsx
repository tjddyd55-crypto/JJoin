import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
  Stack,
  colors,
  spacing,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../../session/SessionContext';

export function LocationOnboardingScreen() {
  const { completeLocationOnboarding } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(skipPermission: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (!skipPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('위치 권한 없이도 앱을 이용할 수 있습니다. 수동으로 지역을 설정해 주세요.');
        }
      }
      await completeLocationOnboarding();
      router.replace('/(tabs)');
    } catch {
      setError('설정 중 문제가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <Stack gap="lg" style={styles.body}>
        <AppText variant="title">주변 조인 찾기</AppText>
        <AppText variant="body" color="textSecondary">
          가까운 스크린골프장과 조인을 찾으려면 위치 권한이 필요합니다. 거부해도 앱 이용은
          가능합니다.
        </AppText>
        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
        <Button
          label="앱 설정 열기"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      </Stack>
      <BottomActionBar>
        <Button label="위치 허용하고 시작" loading={busy} onPress={() => void finish(false)} />
        <Button
          label="나중에 설정"
          variant="secondary"
          loading={busy}
          onPress={() => void finish(true)}
        />
      </BottomActionBar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingBottom: spacing.lg },
});
