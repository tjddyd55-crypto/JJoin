import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
  Stack,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../../session/SessionContext';

export function IdentityScreen() {
  const { startIdentity, confirmIdentity, cancelIdentity, me } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ return?: string }>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'fail' | 'cancelled'>(
    'idle',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setLoading(true);
    setError(null);
    try {
      const id = await startIdentity();
      setSessionId(id);
      setStatus('pending');
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function onSuccess() {
    if (!sessionId) return;
    setLoading(true);
    try {
      await confirmIdentity(sessionId, 'success');
      setStatus('success');
      if (params.return === 'gate') {
        router.replace('/auth/gate');
      } else if (!me?.authAppHints.profileComplete) {
        router.replace('/auth/profile-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      setStatus('fail');
      setError(t('auth.identity.fail'));
    } finally {
      setLoading(false);
    }
  }

  async function onFail() {
    if (!sessionId) return;
    setLoading(true);
    try {
      await confirmIdentity(sessionId, 'fail');
      setStatus('fail');
      setError(t('auth.identity.fail'));
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function onCancel() {
    if (!sessionId) return;
    setLoading(true);
    try {
      await cancelIdentity(sessionId);
      setStatus('cancelled');
      setError(t('auth.identity.cancel'));
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function onBrowseWithoutVerify() {
    if (params.return === 'gate') {
      router.replace('/(tabs)');
      return;
    }
    router.replace('/auth/profile-setup');
  }

  return (
    <ScreenContainer>
      <Stack gap="md" style={{ flex: 1 }}>
        <AppText variant="title">{t('auth.identity.title')}</AppText>
        <AppText variant="body" color="textSecondary">
          {t('auth.identity.body')}
        </AppText>
        {status === 'success' ? (
          <AppText variant="body" color="primary">
            {t('auth.identity.success')}
          </AppText>
        ) : null}
        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
      </Stack>
      <BottomActionBar>
        {status === 'idle' || status === 'fail' || status === 'cancelled' ? (
          <>
            <Button
              label={status === 'idle' ? t('auth.identity.cta') : t('auth.identity.retry')}
              loading={loading}
              onPress={() => void onStart()}
            />
            <Button
              label={t('auth.gate.later')}
              variant="secondary"
              onPress={onBrowseWithoutVerify}
            />
          </>
        ) : null}
        {status === 'pending' ? (
          <>
            <Button label="Mock 성공" loading={loading} onPress={() => void onSuccess()} />
            <Button
              label="Mock 실패"
              variant="danger"
              loading={loading}
              onPress={() => void onFail()}
            />
            <Button
              label="취소"
              variant="secondary"
              loading={loading}
              onPress={() => void onCancel()}
            />
          </>
        ) : null}
      </BottomActionBar>
    </ScreenContainer>
  );
}
