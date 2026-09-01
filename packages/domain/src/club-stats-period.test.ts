import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isWithinKstYear,
  isWithinRolling30Days,
  kstYearStartUtc,
  rolling30DayStartUtc,
} from './club-stats-period';

test('kstYearStartUtc uses Asia/Seoul calendar year', () => {
  const ref = new Date('2026-03-15T10:00:00+09:00');
  const start = kstYearStartUtc(ref);
  assert.equal(start.toISOString(), '2025-12-31T15:00:00.000Z');
  assert.equal(isWithinKstYear(new Date('2026-01-01T00:00:00+09:00'), ref), true);
  assert.equal(isWithinKstYear(new Date('2025-12-31T23:59:00+09:00'), ref), false);
});

test('rolling30DayStartUtc is 30 days before reference', () => {
  const ref = new Date('2026-03-15T12:00:00.000Z');
  const start = rolling30DayStartUtc(ref);
  assert.equal(ref.getTime() - start.getTime(), 30 * 24 * 60 * 60_000);
  assert.equal(isWithinRolling30Days(new Date(ref.getTime() - 29 * 24 * 60 * 60_000), ref), true);
  assert.equal(isWithinRolling30Days(new Date(ref.getTime() - 31 * 24 * 60 * 60_000), ref), false);
});
