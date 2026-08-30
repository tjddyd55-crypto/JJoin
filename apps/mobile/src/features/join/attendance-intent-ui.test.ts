import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceIntentBadgeVariant,
  attendanceIntentLabel,
  canSetAttendanceIntent,
} from './attendance-intent-ui';

test('attendance intent labels stay orthogonal to COMPLETED/NO_SHOW', () => {
  assert.equal(attendanceIntentLabel('CONFIRMED'), '참석 확정');
  assert.equal(attendanceIntentLabel('PENDING'), '미응답');
  assert.equal(attendanceIntentLabel('DECLINED'), '참석 어려움');
  assert.equal(attendanceIntentLabel(null), '미응답');
  assert.equal(attendanceIntentBadgeVariant('CONFIRMED'), 'success');
  assert.equal(attendanceIntentBadgeVariant('DECLINED'), 'warning');
  assert.equal(attendanceIntentBadgeVariant('PENDING'), 'neutral');
});

test('host cannot set attendance intent', () => {
  assert.equal(canSetAttendanceIntent({ isHost: true, participationStatus: 'APPROVED' }), false);
  assert.equal(
    canSetAttendanceIntent({ isHost: false, participationStatus: 'APPROVED' }),
    true,
  );
  assert.equal(
    canSetAttendanceIntent({ isHost: false, participationStatus: 'APPLIED' }),
    false,
  );
});
