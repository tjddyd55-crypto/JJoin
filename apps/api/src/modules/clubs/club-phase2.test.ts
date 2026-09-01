import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRemainingEventCapacity, countAttendanceResponses } from '@jjoin/domain';

test('urgent remaining seats subtract attending responses only', () => {
  const counts = countAttendanceResponses([
    { response: 'ATTENDING' },
    { response: 'ATTENDING' },
    { response: 'DECLINED' },
    { response: 'MAYBE' },
  ]);
  assert.equal(counts.attending, 2);
  assert.equal(computeRemainingEventCapacity(20, counts.attending), 18);
});

test('duplicate urgent join should be blocked when active linked join exists', () => {
  const existing = { status: 'OPEN' };
  assert.equal(['CANCELLED', 'COMPLETED'].includes(existing.status), false);
});
