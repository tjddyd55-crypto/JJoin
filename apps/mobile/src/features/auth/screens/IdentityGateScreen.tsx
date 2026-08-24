import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Icon,
  ScreenFrame,
  StickyActionFrame,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useRouter } from 'expo-router';
import { IdentityStatus } from '@jjoin/types';
import { useSession } from '../../../session/SessionContext';

export function IdentityGateScreen() {
  const { me, completeGateAndReturn } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const verified = me?.identity.verificationStatus === IdentityStatus.VERIFIED;

  useEffect(() => {
    if (!verified) return;
    const path = completeGateAndReturn();
    router.replace(path as never);
  }, [verified, completeGateAndReturn, router]);

  if (verified) {
    return (
      <ScreenFrame>
        <View style={styles.loadingState}>
          <Text variant="body" tone="secondary">
            {t('common.loading')}
          </Text>
        </View>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame>
      <View style={styles.body}>
        <Card variant="elevated" padding="md" style={styles.card}>
          <View
            style={[
              styles.iconShell,
              {
                borderColor: theme.colors.border.subtle,
                backgroundColor: theme.colors.surface.base,
                borderRadius: theme.radius.full,
              },
            ]}
          >
            <Icon name="verified" tone="gold" size="lg" accessibilityLabel={t('auth.gate.verify')} />
          </View>
          <Text variant="headline" tone="primary" style={styles.centerText}>
            {t('auth.gate.identityRequired')}
          </Text>
          <Text variant="body" tone="secondary" style={styles.centerText}>
            {t('auth.gate.identityDescription')}
          </Text>
        </Card>
      </View>
      <StickyActionFrame>
        <Button label={t('auth.gate.verify')} onPress={() => router.push('/auth/identity?return=gate')} />
        <Button label={t('auth.gate.later')} variant="secondary" onPress={() => router.replace('/(tabs)')} />
      </StickyActionFrame>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    gap: 12,
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
