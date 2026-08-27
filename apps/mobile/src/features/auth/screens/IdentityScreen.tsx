import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  ScreenFrame,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getApiClient } from '../../../lib/api';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';

export function IdentityScreen() {
  const { startIdentity, confirmIdentity, cancelIdentity } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ return?: string }>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'fail' | 'cancelled'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capability, setCapability] = useState<{
    status: string;
    canStart: boolean;
    message: string | null;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const api = getApiClient(getSecureSessionStore());
        const result = await api.getIdentityCapability();
        setCapability(result);
      } catch {
        setCapability({ status: 'UNKNOWN', canStart: false, message: t('common.error') });
      }
    })();
  }, []);

  async function onStart() {
    setLoading(true);
    setError(null);
    try {
      const nextSessionId = await startIdentity();
      setSessionId(nextSessionId);
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
    setError(null);
    try {
      await confirmIdentity(sessionId, 'success');
      setStatus('success');
      router.replace(params.return === 'gate' ? '/auth/gate' : '/(tabs)');
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

  function onLater() {
    router.replace(params.return === 'gate' ? '/(tabs)' : '/(tabs)');
  }

  return (
    <ScreenFrame>
      <View style={styles.body}>
        <Card variant="elevated" padding="md" style={styles.card}>
          <Text variant="headline" tone="primary">
            {t('auth.identity.title')}
          </Text>
          <Text variant="body" tone="secondary">
            {t('auth.identity.body')}
          </Text>
          {capability?.status === 'UNAVAILABLE' ? (
            <Text variant="caption" tone="secondary">
              {capability.message ?? '본인확인 서비스 준비 중입니다.'}
            </Text>
          ) : null}
          {status === 'success' ? (
            <Text variant="body" tone="primary">
              {t('auth.identity.success')}
            </Text>
          ) : null}
          {error ? (
            <Text variant="body" tone="error">
              {error}
            </Text>
          ) : null}
        </Card>
      </View>
      <StickyActionFrame>
        {status === 'idle' || status === 'fail' || status === 'cancelled' ? (
          <>
            {capability?.canStart !== false ? (
              <Button
                label={status === 'idle' ? t('auth.identity.cta') : t('auth.identity.retry')}
                loading={loading}
                onPress={() => void onStart()}
              />
            ) : null}
            <Button label={t('auth.gate.later')} variant="secondary" onPress={onLater} />
          </>
        ) : null}
        {status === 'pending' && capability?.canStart ? (
          <>
            {isInternalToolsEnabled() ? (
              <>
                <Button label="Mock 성공" loading={loading} onPress={() => void onSuccess()} />
                <Button label="Mock 실패" variant="danger" loading={loading} onPress={() => void onFail()} />
              </>
            ) : null}
            <Button label="취소" variant="secondary" loading={loading} onPress={() => void onCancel()} />
          </>
        ) : null}
      </StickyActionFrame>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    gap: 12,
  },
});
