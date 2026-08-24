import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import {
  Button,
  Card,
  FormScreenFrame,
  Icon,
  StickyActionFrame,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useRouter } from 'expo-router';
import { useSession } from '../../../session/SessionContext';
import { OnboardingHeader } from '../../../ui/patterns';

export function LocationOnboardingScreen() {
  const { completeLocationOnboarding } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(skipPermission: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (!skipPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError(t('auth.location.denied'));
        }
      }
      await completeLocationOnboarding();
      router.replace('/(tabs)');
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreenFrame
      footer={
        <StickyActionFrame>
          <Button label={t('auth.location.allow')} loading={busy} onPress={() => void finish(false)} />
          <Button
            label={t('auth.location.later')}
            variant="secondary"
            loading={busy}
            onPress={() => void finish(true)}
          />
        </StickyActionFrame>
      }
    >
      <OnboardingHeader
        step={4}
        title={t('auth.location.title')}
        description={t('auth.location.subtitle')}
      />

      <Card variant="elevated" padding="md" style={styles.heroCard}>
        <View
          style={[
            styles.iconShell,
            {
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.surface.base,
              borderColor: theme.colors.border.subtle,
            },
          ]}
        >
          <Icon name="location" tone="gold" size="lg" accessibilityLabel="위치" />
        </View>
        <Text variant="sectionTitle" tone="primary" style={styles.centerText}>
          {t('auth.location.title')}
        </Text>
        <Text variant="body" tone="secondary" style={styles.centerText}>
          {t('auth.location.body')}
        </Text>
      </Card>

      <Button
        label={t('auth.location.settings')}
        variant="ghost"
        onPress={() => void Linking.openSettings()}
      />

      {error ? (
        <Text variant="body" tone="error">
          {error}
        </Text>
      ) : null}
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  iconShell: {
    width: 72,
    height: 72,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
