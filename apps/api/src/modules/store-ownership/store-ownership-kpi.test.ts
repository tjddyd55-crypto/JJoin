import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeStoreOwnershipKpi,
  formatKoreanPhoneDisplay,
  isStoreKpiSucceededStatus,
} from '@jjoin/domain';

test('KPI succeeded statuses are mutually exclusive per join status', () => {
  assert.equal(isStoreKpiSucceededStatus('CONFIRMED'), true);
  assert.equal(isStoreKpiSucceededStatus('COMPLETED'), true);
  assert.equal(isStoreKpiSucceededStatus('CANCELLED'), false);
  assert.equal(isStoreKpiSucceededStatus('OPEN'), false);
});

test('phone display formats store verification contact', () => {
  assert.equal(formatKoreanPhoneDisplay('01022221382'), '010-2222-1382');
});

test('KPI success rate uses exclusive buckets', () => {
  const kpi = computeStoreOwnershipKpi([
    { status: 'COMPLETED', startAt: '2026-01-01T00:00:00.000Z', confirmedPlayerCount: 4 },
    { status: 'CANCELLED', startAt: '2026-01-02T00:00:00.000Z', confirmedPlayerCount: 0 },
  ]);
  assert.equal(kpi.attemptCount, 2);
  assert.equal(kpi.succeededCount, 1);
  assert.equal(kpi.successRatePercent, 50);
});
