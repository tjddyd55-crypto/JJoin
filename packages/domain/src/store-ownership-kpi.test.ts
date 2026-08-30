import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeStoreOwnershipKpi,
  filterJoinsByKpiPeriod,
} from './store-ownership-kpi';

test('computeStoreOwnershipKpi does not double-count CONFIRMED and COMPLETED', () => {
  const kpi = computeStoreOwnershipKpi([
    {
      status: 'OPEN',
      startAt: '2026-01-01T00:00:00.000Z',
      confirmedPlayerCount: 1,
    },
    {
      status: 'CONFIRMED',
      startAt: '2026-01-02T00:00:00.000Z',
      confirmedPlayerCount: 4,
    },
    {
      status: 'COMPLETED',
      startAt: '2026-01-03T00:00:00.000Z',
      confirmedPlayerCount: 4,
    },
    {
      status: 'CANCELLED',
      startAt: '2026-01-04T00:00:00.000Z',
      confirmedPlayerCount: 0,
    },
    {
      status: 'DRAFT',
      startAt: '2026-01-05T00:00:00.000Z',
      confirmedPlayerCount: 0,
    },
  ]);
  assert.equal(kpi.attemptCount, 4);
  assert.equal(kpi.succeededCount, 2);
  assert.equal(kpi.cancelledCount, 1);
  assert.equal(kpi.successRatePercent, 50);
  assert.equal(kpi.participantSum, 9);
  assert.equal(kpi.completedCount, 1);
  assert.equal(kpi.lastJoinAt, '2026-01-04T00:00:00.000Z');
  assert.equal(kpi.lastSucceededAt, '2026-01-03T00:00:00.000Z');
});

test('filterJoinsByKpiPeriod 30d', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');
  const filtered = filterJoinsByKpiPeriod(
    [
      { status: 'COMPLETED', startAt: '2026-08-01T00:00:00.000Z' },
      { status: 'COMPLETED', startAt: '2026-07-01T00:00:00.000Z' },
    ],
    '30d',
    now,
  );
  assert.equal(filtered.length, 1);
});
