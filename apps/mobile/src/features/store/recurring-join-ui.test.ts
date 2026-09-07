import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dayOfWeekLabel,
  nextOccurrenceDateForSkip,
  recurringStatusLabel,
} from './recurring-join-ui';

test('dayOfWeekLabel covers Mon–Sun', () => {
  assert.equal(dayOfWeekLabel(1), '월');
  assert.equal(dayOfWeekLabel(7), '일');
});

test('recurringStatusLabel Korean', () => {
  assert.equal(recurringStatusLabel('ACTIVE'), '진행중');
  assert.equal(recurringStatusLabel('PAUSED'), '일시정지');
  assert.equal(recurringStatusLabel('ENDED'), '종료됨');
  assert.equal(recurringStatusLabel('DELETED'), '삭제됨');
});

test('nextOccurrenceDateForSkip prefers nextRunAt', () => {
  assert.equal(
    nextOccurrenceDateForSkip({
      dayOfWeek: 1,
      startTimeLocal: '19:00',
      nextRunAt: '2026-09-07T10:00:00.000Z',
    }),
    '2026-09-07',
  );
});
