import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Button, Card, ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import type { RewardGrantDto, RewardProgressDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

export default function RewardsScreen() {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [progress, setProgress] = useState<RewardProgressDto | null>(null);
  const [history, setHistory] = useState<RewardGrantDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextProgress, nextHistory] = await Promise.all([
        api.getRewardProgress(),
        api.listRewardHistory(),
      ]);
      setProgress(nextProgress);
      setHistory(nextHistory);
      setError(null);
    } catch {
      setError('보상 정보를 불러오지 못했습니다.');
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function checkIn() {
    setBusy(true);
    try {
      const result = await api.checkInAttendance();
      setProgress(result.progress);
      await load();
    } catch {
      setError('오늘 출석 체크에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="screenTitle">출석 · 업적 보상</Text>
      <Text variant="body" tone="secondary">
        하루 1회(KST) 출석과 성사 조인 업적 보상입니다. 성공 기준은 참가 완료(COMPLETED)입니다.
      </Text>
      {error ? <Text tone="error">{error}</Text> : null}
      <Spacer size="md" />
      <Card variant="elevated" padding="md">
        <Text variant="sectionTitle">오늘 출석</Text>
        <Text variant="body">
          {progress?.checkedInToday
            ? '오늘 출석을 완료했습니다'
            : progress?.attendanceEnabled
              ? `출석 보상 ${progress.attendanceAmount}코인`
              : '출석 보상이 꺼져 있습니다'}
        </Text>
        <Spacer size="sm" />
        <Button
          label={progress?.checkedInToday ? '출석 완료' : '출석하기'}
          disabled={progress?.checkedInToday || !progress?.attendanceEnabled}
          loading={busy}
          onPress={() => void checkIn()}
        />
      </Card>
      <Spacer size="md" />
      <Card variant="base" padding="md">
        <Text variant="sectionTitle">호스트 업적</Text>
        <Text>
          성사 {progress?.host.currentCount ?? 0}/{progress?.host.threshold ?? 0}회
          {progress?.host.granted ? ' · 지급 완료' : ''}
        </Text>
      </Card>
      <Spacer size="sm" />
      <Card variant="base" padding="md">
        <Text variant="sectionTitle">참가 업적</Text>
        <Text>
          성사 {progress?.participation.currentCount ?? 0}/{progress?.participation.threshold ?? 0}회
          {progress?.participation.granted ? ' · 지급 완료' : ''}
        </Text>
      </Card>
      <Spacer size="lg" />
      <Text variant="sectionTitle">지급 내역</Text>
      <Spacer size="sm" />
      {history.length === 0 ? (
        <Text tone="secondary">아직 지급된 보상이 없습니다.</Text>
      ) : (
        history.map((row) => (
          <Card key={row.id} variant="base" padding="md">
            <Text variant="bodyStrong">{row.kind}</Text>
            <Text tone="secondary">
              {row.amount}코인 · {new Date(row.createdAt).toLocaleString('ko-KR')}
            </Text>
          </Card>
        ))
      )}
    </ScrollScreenFrame>
  );
}
