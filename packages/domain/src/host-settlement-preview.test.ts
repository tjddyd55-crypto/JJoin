import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeStandardHostSettlement } from './host-settlement-preview';

test('summarizeStandardHostSettlement payout and refund', () => {
  const summary = summarizeStandardHostSettlement({
    rewardPerParticipant: '1000',
    heldTotal: '4000',
    participants: [
      { attended: true },
      { attended: true },
      { attended: true },
      { attended: false },
    ],
  });
  assert.equal(summary.attendedCount, 3);
  assert.equal(summary.noShowCount, 1);
  assert.equal(summary.payoutTotal, '3000');
  assert.equal(summary.unpaidTotal, '1000');
  assert.equal(summary.refundToHost, '1000');
});

test('summarizeStandardHostSettlement all attended refunds unused hold', () => {
  const summary = summarizeStandardHostSettlement({
    rewardPerParticipant: '1000',
    heldTotal: '3000',
    participants: [{ attended: true }, { attended: true }],
  });
  assert.equal(summary.payoutTotal, '2000');
  assert.equal(summary.refundToHost, '1000');
});
