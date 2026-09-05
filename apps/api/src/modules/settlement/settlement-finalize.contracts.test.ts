/**
 * Settlement finalize contracts — retry/idempotency semantics (no Nest DI).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  pickFinalizeRowsToProcess,
  settlementRefundIdempotencyKey,
  settlementTransferIdempotencyKey,
} from '@jjoin/domain';

test('finalize retry skips PAID and REFUNDED rows (failure recovery)', () => {
  const attendance = [
    { participantId: 'b', attended: true },
    { participantId: 'c', attended: true },
    { participantId: 'd', attended: false },
  ];
  const partialFailureState = [
    { participantId: 'b', rewardStatus: 'PAID' },
    { participantId: 'c', rewardStatus: 'PENDING_CONFIRMATION' },
    { participantId: 'd', rewardStatus: 'PENDING_CONFIRMATION' },
  ];
  const retry = pickFinalizeRowsToProcess(attendance, partialFailureState);
  assert.deepEqual(retry.map((r) => r.participantId), ['c', 'd']);
});

test('ledger idempotency keys are stable per settlement row', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(settlementTransferIdempotencyKey(id), `settlement:${id}:reward-transfer`);
  assert.equal(settlementRefundIdempotencyKey(id), `settlement:${id}:reward-refund`);
});
