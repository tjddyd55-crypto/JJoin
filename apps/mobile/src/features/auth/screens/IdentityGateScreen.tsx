import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../../session/SessionContext';
import { IdentityStatus } from '@jjoin/types';

export function IdentityGateScreen() {
  const { me, completeGateAndReturn } = useSession();
  const router = useRouter();
  const verified = me?.identity.verificationStatus === IdentityStatus.VERIFIED;

  useEffect(() => {
    if (!verified) return;
    const path = completeGateAndReturn();
    router.replace(path as never);
  }, [verified, completeGateAndReturn, router]);

  if (verified) {
    return (
      <ScreenContainer>
        <AppText>{t('common.loading')}</AppText>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppText variant="title">{t('app.name')}</AppText>
      <AppText variant="body" color="textSecondary" style={{ marginTop: 12 }}>
        {t('auth.gate.identityRequired')}
      </AppText>
      <BottomActionBar>
        <Button
          label={t('auth.gate.verify')}
          onPress={() => router.push('/auth/identity?return=gate')}
        />
        <Button
          label={t('auth.gate.later')}
          variant="secondary"
          onPress={() => router.replace('/(tabs)')}
        />
      </BottomActionBar>
    </ScreenContainer>
  );
}
