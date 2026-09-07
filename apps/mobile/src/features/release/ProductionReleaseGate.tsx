import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { shouldForceAndroidUpdate } from '@jjoin/domain';
import type { PublicMobileAndroidReleaseDto } from '@jjoin/types';
import { Button, ScreenFrame, Text, spacing, useTheme } from '@jjoin/design-system';
import { getApiClient } from '../../lib/api';
import { isProductionVariant } from '../../lib/app-variant';
import { getSecureSessionStore } from '../../session/SessionContext';
import { downloadAndInstallApk, openUnknownAppInstallSettings } from './apk-install';

type GatePhase = 'checking' | 'ready' | 'blocked' | 'downloading' | 'error';

function resolveCurrentVersionCode(): number {
  const fromConfig = Constants.expoConfig?.android?.versionCode;
  if (typeof fromConfig === 'number' && Number.isInteger(fromConfig)) {
    return fromConfig;
  }
  return 0;
}

export function ProductionReleaseGate({ children }: { children: React.ReactNode }) {
  const productionOnly = isProductionVariant();
  const [phase, setPhase] = useState<GatePhase>(productionOnly ? 'checking' : 'ready');
  const [release, setRelease] = useState<PublicMobileAndroidReleaseDto | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [installError, setInstallError] = useState<string | null>(null);
  const theme = useTheme();

  const currentVersionCode = useMemo(() => resolveCurrentVersionCode(), []);
  const mustUpdate = useMemo(() => {
    if (!release) return false;
    return shouldForceAndroidUpdate(currentVersionCode, release.latestVersionCode);
  }, [currentVersionCode, release]);

  useEffect(() => {
    if (!productionOnly) return;

    let cancelled = false;
    void (async () => {
      try {
        const client = getApiClient(getSecureSessionStore());
        const payload = await client.getPublicMobileAndroidRelease();
        if (cancelled) return;
        setRelease(payload);
        setPhase('ready');
      } catch {
        if (cancelled) return;
        // Fail-open: release API outage must not brick the app.
        setPhase('ready');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productionOnly]);

  useEffect(() => {
    if (!mustUpdate) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [mustUpdate]);

  const onUpdate = useCallback(async () => {
    if (!release?.apkUrl) return;
    setInstallError(null);
    setPhase('downloading');
    setDownloadProgress(0);
    try {
      await downloadAndInstallApk(release.apkUrl, (progress) => {
        if (progress.totalBytes > 0) {
          setDownloadProgress(progress.downloadedBytes / progress.totalBytes);
        }
      });
      setPhase('blocked');
    } catch {
      setInstallError('업데이트를 다운로드하지 못했습니다.');
      setPhase('error');
    }
  }, [release]);

  if (!productionOnly || phase === 'checking') {
    return <>{children}</>;
  }

  if (!mustUpdate) {
    return <>{children}</>;
  }

  const downloading = phase === 'downloading';
  const showRetry = phase === 'error';

  return (
    <Modal visible animationType="fade" onRequestClose={() => undefined}>
        <ScreenFrame>
          <View style={styles.container}>
            <Text variant="title">새 버전이 있습니다</Text>
            <Text variant="body" tone="secondary" style={styles.message}>
              최신 버전으로 업데이트해주세요.
            </Text>
            {release?.releaseNotes ? (
              <Text variant="caption" tone="tertiary" style={styles.notes}>
                {release.releaseNotes}
              </Text>
            ) : null}
            {downloading ? (
              <View style={styles.progressRow}>
                <ActivityIndicator color={theme.colors.action.primary} />
                <Text variant="body" tone="secondary">
                  업데이트 다운로드 중
                  {downloadProgress > 0
                    ? ` ${Math.round(downloadProgress * 100)}%`
                    : ''}
                </Text>
              </View>
            ) : null}
            {installError ? (
              <Text variant="caption" style={{ color: theme.colors.status.error }}>
                {installError}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {showRetry ? (
                <Button label="다시 시도" onPress={() => void onUpdate()} />
              ) : (
                <Button
                  label="업데이트"
                  onPress={() => void onUpdate()}
                  disabled={downloading || !release?.apkUrl}
                />
              )}
              {showRetry ? (
                <Pressable onPress={() => void openUnknownAppInstallSettings()}>
                  <Text variant="caption" tone="secondary" style={styles.permissionLink}>
                    업데이트 설치 권한이 필요합니다.
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScreenFrame>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  message: {
    marginTop: spacing.xs,
  },
  notes: {
    marginTop: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  permissionLink: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
