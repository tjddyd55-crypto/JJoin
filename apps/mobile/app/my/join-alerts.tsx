import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Input,
  ScrollScreenFrame,
  Section,
  Spacer,
  Stack,
  Text,
  useTheme,
} from '@jjoin/design-system';
import {
  JoinAlertDateMode,
  JoinAlertTimeBand,
  type JoinAlertSubscriptionDto,
} from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';

const DATE_OPTIONS: Array<{ value: JoinAlertDateMode; label: string }> = [
  { value: JoinAlertDateMode.TODAY, label: '오늘' },
  { value: JoinAlertDateMode.THIS_WEEK, label: '이번 주' },
];

const TIME_OPTIONS: Array<{ value: JoinAlertTimeBand; label: string }> = [
  { value: JoinAlertTimeBand.ANY, label: '전체' },
  { value: JoinAlertTimeBand.MORNING, label: '오전' },
  { value: JoinAlertTimeBand.AFTERNOON, label: '오후' },
  { value: JoinAlertTimeBand.EVENING, label: '저녁' },
];

function alertSummary(item: JoinAlertSubscriptionDto): string {
  const region = [item.sido, item.sigungu].filter(Boolean).join(' ') || '전국';
  const date =
    item.dateMode === JoinAlertDateMode.TODAY
      ? '오늘'
      : item.dateMode === JoinAlertDateMode.THIS_WEEK
        ? '이번 주'
        : (item.specificDate ?? '날짜');
  const time =
    TIME_OPTIONS.find((o) => o.value === item.timeBand)?.label ?? item.timeBand;
  return `${region} · ${date} · ${time}`;
}

export default function JoinAlertsScreen() {
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<JoinAlertSubscriptionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sido, setSido] = useState('');
  const [sigungu, setSigungu] = useState('');
  const [dateMode, setDateMode] = useState<JoinAlertDateMode>(JoinAlertDateMode.TODAY);
  const [timeBand, setTimeBand] = useState<JoinAlertTimeBand>(JoinAlertTimeBand.ANY);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listJoinAlerts());
    } catch {
      setError('조인 알림을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await api.createJoinAlert({
        sido: sido.trim() || undefined,
        sigungu: sigungu.trim() || undefined,
        dateMode,
        timeBand,
        joinableOnly: true,
      });
      setSido('');
      setSigungu('');
      await load();
    } catch {
      setError('알림 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await api.deleteJoinAlert(id);
      await load();
    } catch {
      setError('알림 삭제에 실패했습니다.');
    }
  }

  async function onToggleEnabled(item: JoinAlertSubscriptionDto) {
    try {
      await api.updateJoinAlert(item.id, { enabled: !item.enabled });
      await load();
    } catch {
      setError('알림 상태 변경에 실패했습니다.');
    }
  }

  return (
    <ScrollScreenFrame>
      <Text variant="screenTitle" tone="primary">
        조인 알림
      </Text>
      <Text variant="body" tone="secondary">
        조건에 맞는 새 조인이 올라오면 알려드립니다.
      </Text>
      <Spacer size="md" />

      <Section title="새 알림">
        <Stack gap="sm">
          <Input label="시/도" value={sido} onChangeText={setSido} placeholder="예: 서울특별시" />
          <Input
            label="시/군/구"
            value={sigungu}
            onChangeText={setSigungu}
            placeholder="예: 강남구 (선택)"
          />
          <Text variant="meta" tone="secondary">
            날짜
          </Text>
          <View style={styles.chipRow}>
            {DATE_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={dateMode === opt.value}
                onPress={() => setDateMode(opt.value)}
              />
            ))}
          </View>
          <Text variant="meta" tone="secondary">
            시간대
          </Text>
          <View style={styles.chipRow}>
            {TIME_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={timeBand === opt.value}
                onPress={() => setTimeBand(opt.value)}
              />
            ))}
          </View>
          <Button label="알림 저장" loading={saving} onPress={() => void onSave()} />
        </Stack>
      </Section>

      <Spacer size="md" />
      <Section title="내 알림">
        {loading ? (
          <Text variant="body" tone="secondary">
            불러오는 중…
          </Text>
        ) : null}
        {error ? (
          <Text variant="body" tone="error">
            {error}
          </Text>
        ) : null}
        {!loading && items.length === 0 ? (
          <Text variant="body" tone="secondary">
            등록된 알림이 없습니다.
          </Text>
        ) : null}
        <Stack gap="sm">
          {items.map((item) => (
            <Card
              key={item.id}
              variant="base"
              padding="md"
              style={{
                borderColor: theme.colors.border.subtle,
                opacity: item.enabled ? 1 : 0.7,
              }}
            >
              <Stack gap="sm">
                <Text variant="bodyStrong" tone="primary">
                  {item.label?.trim() || alertSummary(item)}
                </Text>
                <Text variant="caption" tone="secondary">
                  {alertSummary(item)}
                  {item.enabled ? '' : ' · 꺼짐'}
                </Text>
                <View style={styles.actions}>
                  <Button
                    label={item.enabled ? '끄기' : '켜기'}
                    variant="secondary"
                    fullWidth={false}
                    onPress={() => void onToggleEnabled(item)}
                  />
                  <Button
                    label="삭제"
                    variant="ghost"
                    fullWidth={false}
                    onPress={() => void onDelete(item.id)}
                  />
                </View>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Section>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
