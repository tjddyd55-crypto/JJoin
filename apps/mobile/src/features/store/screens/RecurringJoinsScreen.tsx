import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
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
  recurringScheduleTitle,
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
      setError('반복 조인 목록을 불러오지 못했습니다.');
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
    Alert.alert('일시정지', '이 반복 조인을 일시정지할까요?', [
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
    Alert.alert('재개', '이 반복 조인을 다시 시작할까요?', [
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

  function confirmEnd(schedule: RecurringJoinScheduleDto) {
    Alert.alert('종료', '반복 조인을 종료할까요? 이후 회차는 생성되지 않습니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: () =>
          void runAction(
            schedule.id,
            () => api.endRecurringJoin(schedule.id),
            '종료에 실패했습니다.',
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
      Alert.alert('다음 회차 건너뛰기', '다음 일정을 확인할 수 없습니다.');
      return;
    }
    Alert.alert(
      '다음 회차 건너뛰기',
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

  const hostItems = items.filter((s) => s.kind === 'HOST_JOIN');
  const storeItems = items.filter((s) => s.kind !== 'HOST_JOIN');

  function renderCard(schedule: RecurringJoinScheduleDto) {
    const busy = busyId === schedule.id;
    const statusVariant =
      schedule.status === 'ACTIVE'
        ? 'success'
        : schedule.status === 'PAUSED'
          ? 'warning'
          : 'neutral';
    const isHost = schedule.kind === 'HOST_JOIN';
    const readOnly = schedule.status === 'ENDED';
    return (
      <Card key={schedule.id} variant="elevated" padding="md" style={styles.card}>
        <Row justify="space-between" align="center">
          <Text variant="bodyStrong" tone="primary" style={styles.title}>
            {recurringScheduleTitle(schedule)}
          </Text>
          <Badge label={recurringStatusLabel(schedule.status)} variant={statusVariant} />
        </Row>
        <Text variant="caption" tone="secondary">
          매주 {dayOfWeekLabel(schedule.dayOfWeek)} {schedule.startTimeLocal}
          {isHost
            ? ` · 생성 ${schedule.occurrencesCreatedCount}회`
            : ` · 남${schedule.targetMaleCount ?? 0}여${schedule.targetFemaleCount ?? 0}`}
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
        {schedule.recentOccurrences?.length ? (
          <View style={styles.links}>
            {schedule.recentOccurrences
              .filter((o) => o.joinId)
              .map((o) => (
                <Pressable
                  key={`${o.occurrenceDate}-${o.joinId}`}
                  onPress={() =>
                    router.push({
                      pathname: '/join/[joinId]',
                      params: { joinId: o.joinId! },
                    } as Href)
                  }
                >
                  <Text variant="caption" tone="primary">
                    {o.occurrenceDate} 조인 보기
                  </Text>
                </Pressable>
              ))}
          </View>
        ) : null}

        {!readOnly ? (
          <>
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
                  label="다음 회차 건너뛰기"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onPress={() => confirmSkip(schedule)}
                  fullWidth={false}
                />
              ) : null}
              {isHost ? (
                <Button
                  label="종료"
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onPress={() => confirmEnd(schedule)}
                  fullWidth={false}
                />
              ) : (
                <Button
                  label="삭제"
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onPress={() => confirmDelete(schedule)}
                  fullWidth={false}
                />
              )}
            </View>
          </>
        ) : null}
      </Card>
    );
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="body" tone="secondary">
        매주 같은 요일·시간에 조인을 자동 생성합니다.
      </Text>

      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">{error}</Text>
        </>
      ) : null}

      <Spacer size="lg" />
      {hostItems.length > 0 ? (
        <>
          <Text variant="sectionTitle" tone="primary">내 반복 조인</Text>
          <Spacer size="sm" />
          {hostItems.map(renderCard)}
          <Spacer size="md" />
        </>
      ) : null}

      {storeItems.length > 0 ? (
        <>
          <Text variant="sectionTitle" tone="primary">매장 정기 조인</Text>
          <Spacer size="sm" />
          <Button
            label="정기 조인 만들기"
            onPress={() => router.push('/my/create-recurring-join')}
            fullWidth
          />
          <Spacer size="sm" />
          {storeItems.map(renderCard)}
        </>
      ) : hostItems.length === 0 ? (
        <Card variant="base" padding="md">
          <Text variant="caption" tone="tertiary">
            등록된 반복 조인이 없습니다. 조인 만들기에서 매주 반복을 선택해 등록할 수 있습니다.
          </Text>
        </Card>
      ) : null}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  title: { flex: 1, paddingRight: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  links: { marginTop: 6, gap: 4 },
});
