import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOwnerTodaySummary,
  isJoinOnKstDate,
  sortOwnerTodayJoins,
  validateVariableCoinPurchaseAmount,
} from '@jjoin/domain';

test('owner dashboard today summary for mixed statuses', () => {
  const summary = buildOwnerTodaySummary([
    { id: '1', status: 'OPEN', startAt: '2026-09-06T01:00:00.000Z' },
    { id: '2', status: 'SETTLING', startAt: '2026-09-06T02:00:00.000Z' },
    { id: '3', status: 'COMPLETED', startAt: '2026-09-06T03:00:00.000Z' },
  ]);
  assert.equal(summary.recruitingCount, 1);
  assert.equal(summary.settlementPendingCount, 1);
  assert.equal(summary.completedCount, 1);
});

test('cancelled join excluded from today operational counts', () => {
  const summary = buildOwnerTodaySummary([
    { id: '1', status: 'CANCELLED', startAt: '2026-09-06T01:00:00.000Z' },
  ]);
  assert.equal(summary.recruitingCount, 0);
  assert.equal(summary.scheduledCount, 0);
});

test('today join action priority puts settlement first', () => {
  const sorted = sortOwnerTodayJoins([
    { id: 'a', status: 'OPEN', startAt: '2026-09-06T10:00:00.000Z' },
    { id: 'b', status: 'SETTLING', startAt: '2026-09-06T11:00:00.000Z' },
  ]);
  assert.equal(sorted[0]?.id, 'b');
});

test('different store join date filter is per join startAt only', () => {
  assert.equal(
    isJoinOnKstDate({ status: 'OPEN', startAt: '2026-09-05T14:00:00.000Z' }, '2026-09-05'),
    true,
  );
  assert.equal(
    isJoinOnKstDate({ status: 'OPEN', startAt: '2026-09-05T14:00:00.000Z' }, '2026-09-06'),
    false,
  );
});

test('owner free policy effective fee is zero coin', () => {
  const fee = validateVariableCoinPurchaseAmount(0);
  assert.equal(fee.ok, false);
});
