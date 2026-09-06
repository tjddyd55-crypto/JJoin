import assert from 'node:assert/strict';
import test from 'node:test';
import { kstDayBoundsUtc } from './join-discovery';
import {
  buildOwnerParticipantSummary,
  buildOwnerPeriodStats,
  buildOwnerSettlementSummary,
  buildOwnerTodaySummary,
  isJoinOnKstDate,
  ownerJoinActionPriority,
  sortOwnerTodayJoins,
  validateVariableCoinPurchaseAmount,
} from './index';

test('owner today summary counts store joins by status', () => {
  const summary = buildOwnerTodaySummary([
    { id: '1', status: 'OPEN', startAt: '2026-09-06T05:00:00.000Z' },
    { id: '2', status: 'FULL', startAt: '2026-09-06T06:00:00.000Z' },
    { id: '3', status: 'SETTLING', startAt: '2026-09-06T07:00:00.000Z' },
    { id: '4', status: 'COMPLETED', startAt: '2026-09-06T08:00:00.000Z' },
    { id: '5', status: 'CONFIRMED', startAt: '2026-09-06T09:00:00.000Z' },
  ]);
  assert.equal(summary.recruitingCount, 2);
  assert.equal(summary.settlementPendingCount, 1);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.scheduledCount, 1);
});

test('participant summary excludes cancelled and counts no-show', () => {
  const summary = buildOwnerParticipantSummary([
    { joinId: 'a', participationStatus: 'CONFIRMED' },
    { joinId: 'a', participationStatus: 'COMPLETED' },
    { joinId: 'b', participationStatus: 'NO_SHOW' },
    { joinId: 'c', participationStatus: 'APPLIED' },
    { joinId: 'd', participationStatus: 'CANCELLED' },
  ]);
  assert.equal(summary.confirmedCount, 2);
  assert.equal(summary.noShowCount, 1);
  assert.equal(summary.pendingCount, 1);
  assert.equal(summary.totalExpected, 4);
  assert.equal(summary.waitlistCount, 0);
});

test('participant summary counts waitlist rows separately', () => {
  const summary = buildOwnerParticipantSummary([
    { joinId: 'a', participationStatus: 'WAITLISTED' },
    { joinId: 'a', participationStatus: 'OFFERED' },
    { joinId: 'b', participationStatus: 'APPROVED' },
  ]);
  assert.equal(summary.waitlistCount, 2);
  assert.equal(summary.pendingCount, 1);
});

test('settlement summary aggregates reward statuses', () => {
  const todayKey = '2026-09-06';
  const { start, end } = kstDayBoundsUtc(todayKey);
  const summary = buildOwnerSettlementSummary(
    [
      { joinId: 'j1', amount: 50, rewardStatus: 'HELD' },
      { joinId: 'j2', amount: 70, rewardStatus: 'PENDING_CONFIRMATION' },
      {
        joinId: 'j3',
        amount: 80,
        rewardStatus: 'PAID',
        paidAt: start.toISOString(),
      },
    ],
    new Set(['j4']),
    start,
    end,
  );
  assert.equal(summary.pendingCount, 2);
  assert.equal(summary.payoutDueCoin, '70');
  assert.equal(summary.holdCoin, '50');
  assert.equal(summary.paidTodayCoin, '80');
});

test('today joins sort by action priority', () => {
  const sorted = sortOwnerTodayJoins([
    { id: 'c', status: 'COMPLETED', startAt: '2026-09-06T12:00:00.000Z' },
    { id: 's', status: 'SETTLING', startAt: '2026-09-06T10:00:00.000Z' },
    { id: 'o', status: 'OPEN', startAt: '2026-09-06T09:00:00.000Z' },
  ]);
  assert.deepEqual(sorted.map((j) => j.id), ['s', 'o', 'c']);
  assert.equal(ownerJoinActionPriority({ id: 'x', status: 'SETTLING', startAt: '' }), 0);
});

test('period stats fill rate uses planned capacity', () => {
  const stats = buildOwnerPeriodStats({
    joins: [
      {
        id: '1',
        status: 'COMPLETED',
        startAt: new Date().toISOString(),
        plannedPlayerCount: 4,
        confirmedPlayerCount: 3,
      },
    ],
    participants: [
      { joinId: '1', participationStatus: 'COMPLETED' },
      { joinId: '1', participationStatus: 'NO_SHOW' },
    ],
    periodDays: 7,
  });
  assert.equal(stats.completedJoinCount, 1);
  assert.equal(stats.noShowCount, 1);
  assert.equal(stats.fillRatePercent, 75);
});

test('isJoinOnKstDate respects KST calendar day', () => {
  assert.equal(
    isJoinOnKstDate({ status: 'OPEN', startAt: '2026-09-05T15:00:00.000Z' }, '2026-09-06'),
    true,
  );
});

test('variable coin tampering: server price from coin amount only', () => {
  const ok = validateVariableCoinPurchaseAmount(100);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.priceKrw, 10000);
});
