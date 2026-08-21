import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Button, ScreenContainer, Stack, spacing } from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../src/session/SessionContext';

export default function CreateScreen() {
  const { requestGatedAction } = useSession();
  const router = useRouter();

  function onCreate() {
    const result = requestGatedAction({ type: 'CREATE_JOIN' });
    if (!result.allowed) {
      router.push('/auth/gate');
      return;
    }
  }

  function onApplyDemo() {
    const result = requestGatedAction({ type: 'APPLY_JOIN', joinId: 'demo-join' });
    if (!result.allowed) {
      router.push('/auth/gate');
    }
  }

  return (
    <ScreenContainer>
      <Stack gap="md" style={styles.body}>
        <AppText variant="subtitle">{t('nav.create')}</AppText>
        <AppText variant="body" color="textSecondary">
          Identity Gate demo — 실제 조인 생성은 다음 Slice
        </AppText>
        <Button label={t('create.gateDemo')} onPress={onCreate} />
        <Button label={t('create.applyDemo')} variant="secondary" onPress={onApplyDemo} />
      </Stack>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.lg },
});
