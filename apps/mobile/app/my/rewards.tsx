import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Button, Card, ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import type {
  RewardGrantDto,
  RewardMilestoneProgressDto,
  RewardProgressDto,
  RewardToastDto,
} from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

function grantKindLabel(kind: RewardGrantDto['kind']): string {
  if (kind === 'ATTENDANCE') return '출석';
  if (kind === 'HOST_MILESTONE') return '호스트 업적';
  return '참가 업적';
}

function milestoneStatus(row: RewardMilestoneProgressDto): string {
  if (row.granted) return '지급 완료';
  if (row.reached) return '지급 대기';
  return `남은 ${row.remaining}회`;
}

export default function RewardsScreen() {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [progress, setProgress] = useState<RewardProgressDto | null>(null);
  const [history, setHistory] = useState<RewardGrantDto[]>([]);
  const [toast, setToast] = useState<RewardToastDto | null>(null);
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

  async function ping() {
    setBusy(true);
    try {
      const result = await api.pingAttendance();
      setProgress(result.progress);
      setToast(result.toast ?? result.newlyGrantedMilestones[0]?.toast ?? null);
      await load();
    } catch {
      setError('출석 확인에 실패했습니다. 앱 이용은 그대로 가능합니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="screenTitle">활동 보상</Text>
      <Text variant="body" tone="secondary">
        앱에 들어오면 KST 날짜 기준으로 하루 1회 자동 출석됩니다. 호스트/참가 업적은 조인
        COMPLETED만 집계합니다.
      </Text>
      {toast ? (
        <>
          <Spacer size="sm" />
          <Card variant="elevated" padding="md">
            <Text variant="bodyStrong">{toast.title}</Text>
            <Text tone="secondary">{toast.body}</Text>
          </Card>
        </>
      ) : null}
      {error ? <Text tone="error">{error}</Text> : null}
      <Spacer size="md" />
      <Card variant="elevated" padding="md">
        <Text variant="sectionTitle">출석 스트릭</Text>
        <Text variant="body">
          {progress?.checkedInToday ? '오늘 출석 완료' : '오늘 출석 전'} · 연속{' '}
          {progress?.currentStreak ?? 0}일
        </Text>
        <Text tone="secondary">
          최장 {progress?.bestStreak ?? 0}일 · 누적 {progress?.totalAttendanceDays ?? 0}일
          {progress?.attendanceEnabled
            ? ` · 출석 보상 ${progress.attendanceAmount}코인`
            : ' · 출석 보상 꺼짐'}
        </Text>
        <Spacer size="sm" />
        <Button
          label={progress?.checkedInToday ? '오늘 기록됨' : '출석 상태 확인'}
          disabled={busy}
          loading={busy}
          onPress={() => void ping()}
        />
      </Card>
      <Spacer size="md" />
      <MilestoneCard title="호스트 업적" track={progress?.host} />
      <Spacer size="sm" />
      <MilestoneCard title="참가 업적" track={progress?.participation} />
      <Spacer size="lg" />
      <Text variant="sectionTitle">지급 내역</Text>
      <Spacer size="sm" />
      {history.length === 0 ? (
        <Text tone="secondary">아직 지급된 보상이 없습니다.</Text>
      ) : (
        history.map((row) => (
          <Card key={row.id} variant="base" padding="md">
            <Text variant="bodyStrong">{grantKindLabel(row.kind)}</Text>
            <Text tone="secondary">
              {row.amount}코인 · {row.milestoneKey} ·{' '}
              {new Date(row.createdAt).toLocaleString('ko-KR')}
            </Text>
          </Card>
        ))
      )}
    </ScrollScreenFrame>
  );
}

function MilestoneCard({
  title,
  track,
}: {
  title: string;
  track: RewardProgressDto['host'] | undefined;
}) {
  const rows = track?.milestones ?? [];
  return (
    <Card variant="base" padding="md">
      <Text variant="sectionTitle">{title}</Text>
      <Text>
        성사 {track?.currentCount ?? 0}회
        {track?.enabled === false ? ' · 보상 꺼짐' : ''}
      </Text>
      <Spacer size="sm" />
      {rows.length === 0 ? (
        <Text tone="secondary">설정된 마일스톤이 없습니다.</Text>
      ) : (
        rows.map((row) => (
          <Text key={row.threshold}>
            {row.threshold}회 · {row.amount}코인 · {milestoneStatus(row)}
          </Text>
        ))
      )}
    </Card>
  );
}
