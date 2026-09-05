import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pickFinalizeRowsToProcess,
  sortFinalizeAttendanceForProcessing,
} from './settlement-finalize';

test('sortFinalizeAttendanceForProcessing pays attended first', () => {
  const sorted = sortFinalizeAttendanceForProcessing([
    { participantId: 'd', attended: false },
    { participantId: 'b', attended: true },
    { participantId: 'c', attended: true },
  ]);
  assert.deepEqual(sorted.map((r) => r.participantId), ['b', 'c', 'd']);
});

test('retry after partial success skips terminal rows only', () => {
  const attendance = [
    { participantId: 'b', attended: true },
    { participantId: 'c', attended: true },
    { participantId: 'd', attended: false },
  ];
  const afterPartial = [
    { participantId: 'b', rewardStatus: 'PAID' },
    { participantId: 'c', rewardStatus: 'PENDING_CONFIRMATION' },
    { participantId: 'd', rewardStatus: 'PENDING_CONFIRMATION' },
  ];
  const retryPlan = pickFinalizeRowsToProcess(attendance, afterPartial);
  assert.deepEqual(
    retryPlan.map((r) => r.participantId),
    ['c', 'd'],
  );
});

test('fully settled retry processes nothing', () => {
  const attendance = [
    { participantId: 'b', attended: true },
    { participantId: 'c', attended: true },
    { participantId: 'd', attended: false },
  ];
  const settled = [
    { participantId: 'b', rewardStatus: 'PAID' },
    { participantId: 'c', rewardStatus: 'PAID' },
    { participantId: 'd', rewardStatus: 'REFUNDED' },
  ];
  assert.equal(pickFinalizeRowsToProcess(attendance, settled).length, 0);
});
