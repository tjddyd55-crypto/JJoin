import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Row,
  ScrollScreenFrame,
  Spacer,
  Text,
} from '@jjoin/design-system';
import type { RecurringJoinScheduleDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import {
  dayOfWeekLabel,
  nextOccurrenceDateForSkip,
  recurringStatusLabel,
} from '../recurring-join-ui';

export function RecurringJoinsScreen() {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<RecurringJoinScheduleDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await api.listRecurringJoins();
      setItems(next.filter((s) => s.status !== 'DELETED'));
      setError(null);
    } catch {
      setError('정기 조인 목록을 불러오지 못했습니다.');
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function runAction(
    scheduleId: string,
    action: () => Promise<unknown>,
    failMessage: string,
  ) {
    setBusyId(scheduleId);
    try {
      await action();
      await load();
    } catch {
      setError(failMessage);
    } finally {
      setBusyId(null);
    }
  }

  function confirmPause(schedule: RecurringJoinScheduleDto) {
    Alert.alert('일시정지', '이 정기 조인을 일시정지할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '일시정지',
        onPress: () =>
          void runAction(
            schedule.id,
            () => api.pauseRecurringJoin(schedule.id),
            '일시정지에 실패했습니다.',
          ),
      },
    ]);
  }

  function confirmResume(schedule: RecurringJoinScheduleDto) {
    Alert.alert('재개', '이 정기 조인을 다시 시작할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '재개',
        onPress: () =>
          void runAction(
            schedule.id,
            () => api.resumeRecurringJoin(schedule.id),
            '재개에 실패했습니다.',
          ),
      },
    ]);
  }

  function confirmDelete(schedule: RecurringJoinScheduleDto) {
    Alert.alert('삭제', '정기 조인을 삭제할까요? 되돌릴 수 없습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          void runAction(
            schedule.id,
            () => api.deleteRecurringJoin(schedule.id),
            '삭제에 실패했습니다.',
          ),
      },
    ]);
  }

  function confirmSkip(schedule: RecurringJoinScheduleDto) {
    const occurrenceDate = nextOccurrenceDateForSkip({
      dayOfWeek: schedule.dayOfWeek,
      startTimeLocal: schedule.startTimeLocal,
      nextRunAt: schedule.nextRunAt,
    });
    if (!occurrenceDate) {
      Alert.alert('이번 주 건너뛰기', '다음 일정을 확인할 수 없습니다.');
      return;
    }
    Alert.alert(
      '이번 주 건너뛰기',
      `${occurrenceDate} 회차를 생성하지 않습니다. 계속할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '건너뛰기',
          onPress: () =>
            void runAction(
              schedule.id,
              () =>
                api.skipRecurringJoinOccurrence(schedule.id, { occurrenceDate }),
              '건너뛰기에 실패했습니다.',
            ),
        },
      ],
    );
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="body" tone="secondary">
        매주 같은 요일·시간에 모집 조인을 자동 생성합니다.
      </Text>

      <Spacer size="md" />
      <Button
        label="정기 조인 만들기"
        onPress={() => router.push('/my/create-recurring-join')}
        fullWidth
      />

      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}

      <Spacer size="lg" />

      {items.length === 0 ? (
        <Card variant="base" padding="md">
          <Text variant="caption" tone="tertiary">
            등록된 정기 조인이 없습니다.
          </Text>
        </Card>
      ) : (
        items.map((schedule) => {
          const busy = busyId === schedule.id;
          const statusVariant =
            schedule.status === 'ACTIVE'
              ? 'success'
              : schedule.status === 'PAUSED'
                ? 'warning'
                : 'neutral';
          return (
            <Card
              key={schedule.id}
              variant="elevated"
              padding="md"
              style={styles.card}
            >
              <Row justify="space-between" align="center">
                <Text variant="bodyStrong" tone="primary" style={styles.title}>
                  {schedule.facilityName}
                </Text>
                <Badge
                  label={recurringStatusLabel(schedule.status)}
                  variant={statusVariant}
                />
              </Row>
              <Text variant="caption" tone="secondary">
                매주 {dayOfWeekLabel(schedule.dayOfWeek)} {schedule.startTimeLocal} · 남
                {schedule.targetMaleCount}여{schedule.targetFemaleCount}
              </Text>
              {schedule.nextRunAt ? (
                <Text variant="caption" tone="tertiary">
                  다음 생성{' '}
                  {new Date(schedule.nextRunAt).toLocaleString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    month: 'numeric',
                    day: 'numeric',
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              ) : null}

              <Spacer size="sm" />
              <View style={styles.actions}>
                {schedule.status === 'ACTIVE' ? (
                  <Button
                    label="일시정지"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onPress={() => confirmPause(schedule)}
                    fullWidth={false}
                  />
                ) : schedule.status === 'PAUSED' ? (
                  <Button
                    label="재개"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onPress={() => confirmResume(schedule)}
                    fullWidth={false}
                  />
                ) : null}
                {schedule.status === 'ACTIVE' ? (
                  <Button
                    label="이번 주 건너뛰기"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onPress={() => confirmSkip(schedule)}
                    fullWidth={false}
                  />
                ) : null}
                <Button
                  label="삭제"
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onPress={() => confirmDelete(schedule)}
                  fullWidth={false}
                />
              </View>
            </Card>
          );
        })
      )}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  title: {
    flex: 1,
    paddingRight: 8,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
