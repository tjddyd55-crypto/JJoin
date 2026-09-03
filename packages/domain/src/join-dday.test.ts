import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JoinStatus } from '@jjoin/types';
import { computeJoinDdayLabel } from './join-dday';

const TZ = 'Asia/Seoul';

test('computeJoinDdayLabel returns D-DAY for today start', () => {
  const result = computeJoinDdayLabel({
    startAt: '2026-09-17T10:00:00.000Z',
    status: JoinStatus.OPEN,
    now: new Date('2026-09-17T03:00:00.000Z'),
    timeZone: TZ,
  });
  assert.equal(result?.label, 'D-DAY');
  assert.equal(result?.kind, 'today');
});

test('computeJoinDdayLabel returns D-1 for tomorrow', () => {
  const result = computeJoinDdayLabel({
    startAt: '2026-09-18T10:00:00.000Z',
    status: JoinStatus.OPEN,
    now: new Date('2026-09-17T03:00:00.000Z'),
    timeZone: TZ,
  });
  assert.equal(result?.label, 'D-1');
});

test('computeJoinDdayLabel returns D-14 for two weeks ahead', () => {
  const result = computeJoinDdayLabel({
    startAt: '2026-10-01T10:00:00.000Z',
    status: JoinStatus.OPEN,
    now: new Date('2026-09-17T03:00:00.000Z'),
    timeZone: TZ,
  });
  assert.equal(result?.label, 'D-14');
});

test('computeJoinDdayLabel prefers terminal status over D-day', () => {
  const cancelled = computeJoinDdayLabel({
    startAt: '2026-09-20T10:00:00.000Z',
    status: JoinStatus.CANCELLED,
    now: new Date('2026-09-17T03:00:00.000Z'),
    timeZone: TZ,
  });
  assert.equal(cancelled?.label, '취소');
  assert.equal(cancelled?.kind, 'terminal');
});
