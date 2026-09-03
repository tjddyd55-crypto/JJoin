import { JoinStatus } from '@jjoin/types';
import { isTerminalJoinStatus, localDayKey } from './join-discovery';

export type JoinDdayKind = 'today' | 'future' | 'terminal';

export type JoinDdayLabel = {
  label: string;
  kind: JoinDdayKind;
};

function parseDayKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

function dayDiffCalendar(startKey: string, todayKey: string): number {
  const start = parseDayKey(startKey);
  const today = parseDayKey(todayKey);
  return Math.round((start.getTime() - today.getTime()) / 86400000);
}

/**
 * D-day badge for join cards/detail — Asia/Seoul calendar days.
 * Terminal joins show status text instead of D-n.
 */
export function computeJoinDdayLabel(input: {
  startAt: Date | string;
  status: JoinStatus | string;
  now?: Date;
  timeZone?: string;
}): JoinDdayLabel | null {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? 'Asia/Seoul';
  const status = input.status;

  if (status === JoinStatus.CANCELLED) {
    return { label: '취소', kind: 'terminal' };
  }
  if (status === JoinStatus.COMPLETED) {
    return { label: '완료', kind: 'terminal' };
  }
  if (isTerminalJoinStatus(status)) {
    return { label: '종료', kind: 'terminal' };
  }

  const startKey = localDayKey(input.startAt, timeZone);
  const todayKey = localDayKey(now, timeZone);
  const diff = dayDiffCalendar(startKey, todayKey);

  if (diff < 0) return null;
  if (diff === 0) return { label: 'D-DAY', kind: 'today' };
  return { label: `D-${diff}`, kind: 'future' };
}
