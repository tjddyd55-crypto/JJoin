import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Switch, View } from 'react-native';
import {
  Card,
  ListRow,
  ScrollScreenFrame,
  Section,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import type { NotificationPreferenceDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import {
  getCachedExpoPushToken,
  requestNotificationPermission,
} from '../push-registration';

type ToggleKey = keyof Omit<NotificationPreferenceDto, 'pushEnabled'>;

const TOGGLES: Array<{ key: ToggleKey; label: string; description: string }> = [
  { key: 'joinAlertsEnabled', label: '새 조인 알림', description: '조건에 맞는 조인' },
  { key: 'followedStoreEnabled', label: '팔로우 매장 알림', description: '관심 매장 새 조인' },
  { key: 'urgentJoinEnabled', label: '긴급 모집', description: '긴급 자리 알림' },
  { key: 'invitationEnabled', label: '참가자 초대', description: '조인 초대' },
  {
    key: 'attendanceReminderEnabled',
    label: '참석 리마인더',
    description: '조인 시작 전 참석 확인',
  },
  { key: 'bookmarkUpdatesEnabled', label: '찜한 조인', description: '상태 변경 알림' },
];

export function NotificationSettingsScreen() {
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [prefs, setPrefs] = useState<NotificationPreferenceDto | null>(null);
  const [osGranted, setOsGranted] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [prefRes, granted] = await Promise.all([
      api.getNotificationPreference(),
      requestNotificationPermission().catch(() => false),
    ]);
    setPrefs(prefRes);
    setOsGranted(granted || Boolean(getCachedExpoPushToken()));
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (patchBody: Partial<NotificationPreferenceDto>) => {
      if (!prefs) return;
      setBusy(true);
      try {
        const next = await api.setNotificationPreference({ ...prefs, ...patchBody });
        setPrefs(next);
      } catch {
        Alert.alert('저장 실패', '알림 설정을 저장하지 못했습니다.');
      } finally {
        setBusy(false);
      }
    },
    [api, prefs],
  );

  const openOsSettings = () => {
    void Linking.openSettings();
  };

  if (!prefs) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text variant="body" tone="secondary">
          불러오는 중…
        </Text>
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      contentPaddingBottom={theme.layoutSpacing.sectionGap * 2}
    >
      <Section title="푸시 알림">
        <Card variant="base" padding="md">
          <View style={styles.statusRow}>
            <Text variant="body" tone="primary">
              휴대폰 알림 권한
            </Text>
            <Text variant="meta" tone={osGranted ? 'secondary' : 'warning'}>
              {osGranted ? '허용됨' : '차단됨'}
            </Text>
          </View>
          {!osGranted ? (
            <>
              <Spacer size="sm" />
              <ListRow
                label={Platform.OS === 'ios' ? '설정에서 알림 허용' : '앱 알림 설정 열기'}
                onPress={openOsSettings}
                showSeparator={false}
              />
            </>
          ) : null}
          <Spacer size="md" />
          <View style={styles.toggleRow}>
            <View style={styles.toggleMeta}>
              <Text variant="body" tone="primary">
                전체 푸시 알림
              </Text>
              <Text variant="meta" tone="tertiary">
                끄면 휴대폰 푸시 알림을 받지 않습니다. 앱 안의 알림은 계속 확인할 수 있어요.
              </Text>
            </View>
            <Switch
              value={prefs.pushEnabled}
              disabled={busy}
              onValueChange={(v) => void patch({ pushEnabled: v })}
            />
          </View>
        </Card>
      </Section>

      <Section title="알림 종류" subtitle="푸시로 받을 알림 종류를 선택합니다">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            {TOGGLES.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.toggleRow,
                  index < TOGGLES.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.border.subtle,
                  },
                ]}
              >
                <View style={styles.toggleMeta}>
                  <Text variant="body" tone="primary">
                    {item.label}
                  </Text>
                  <Text variant="meta" tone="tertiary">
                    {item.description}
                  </Text>
                </View>
                <Switch
                  value={prefs[item.key]}
                  disabled={busy || !prefs.pushEnabled}
                  onValueChange={(v) => void patch({ [item.key]: v })}
                />
              </View>
            ))}
          </View>
        </Card>
      </Section>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsCard: {
    overflow: 'hidden',
  },
  settingsInner: {
    paddingHorizontal: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  toggleMeta: {
    flex: 1,
    gap: 2,
  },
});
