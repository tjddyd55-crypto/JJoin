import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countPlannedHostOccurrences,
  previewHostRecurringOccurrenceDates,
} from './recurring-join-schedule';

test('countPlannedHostOccurrences respects maxOccurrences', () => {
  const total = countPlannedHostOccurrences({
    dayOfWeek: 6,
    startTimeLocal: '14:00',
    recurrenceStartDate: '2026-09-12',
    maxOccurrences: 4,
  });
  assert.equal(total, 4);
});

test('previewHostRecurringOccurrenceDates returns preview dates', () => {
  const { totalPlanned, previewDates } = previewHostRecurringOccurrenceDates({
    dayOfWeek: 6,
    startTimeLocal: '14:00',
    recurrenceStartDate: '2026-09-12',
    maxOccurrences: 4,
    previewCount: 3,
  });
  assert.equal(totalPlanned, 4);
  assert.equal(previewDates.length, 3);
  assert.equal(previewDates[0], '2026-09-12');
  assert.equal(previewDates[1], '2026-09-19');
});
