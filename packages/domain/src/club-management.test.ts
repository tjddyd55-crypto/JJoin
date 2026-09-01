import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeClubAttendanceRate,
  computeEventAttendedCount,
  computeEventAttendanceDenominator,
  computeRemainingEventCapacity,
  countAttendanceResponses,
  formatAttendanceRateDisplay,
  canLeaveClub,
  isClubStaff,
} from './club-management';
import { ClubMembershipRole, ClubMembershipStatus } from '@jjoin/types';

test('computeClubAttendanceRate returns null for zero denominator', () => {
  assert.equal(computeClubAttendanceRate({ attendedCount: 0, denominatorCount: 0 }), null);
  assert.equal(formatAttendanceRateDisplay(null), '-');
});

test('computeClubAttendanceRate rounds percentage', () => {
  assert.equal(computeClubAttendanceRate({ attendedCount: 3, denominatorCount: 4 }), 75);
  assert.equal(formatAttendanceRateDisplay(74), '74%');
});

test('countAttendanceResponses aggregates response and final states', () => {
  const counts = countAttendanceResponses([
    { response: 'ATTENDING', finalStatus: 'ATTENDED' },
    { response: 'ATTENDING', finalStatus: null },
    { response: 'DECLINED' },
    { response: 'MAYBE' },
    { response: 'NO_RESPONSE', finalStatus: 'NO_SHOW' },
  ]);
  assert.equal(counts.attending, 2);
  assert.equal(counts.declined, 1);
  assert.equal(counts.maybe, 1);
  assert.equal(counts.noResponse, 1);
  assert.equal(counts.attended, 1);
  assert.equal(counts.noShow, 1);
});

test('event attendance denominator excludes declined and no-response unless finalized', () => {
  const rows = [
    { response: 'ATTENDING', finalStatus: 'ATTENDED' },
    { response: 'MAYBE', finalStatus: null },
    { response: 'DECLINED', finalStatus: null },
    { response: 'NO_RESPONSE', finalStatus: 'NO_SHOW' },
  ];
  assert.equal(computeEventAttendanceDenominator(rows), 3);
  assert.equal(computeEventAttendedCount(rows), 1);
});

test('remaining capacity never goes below zero', () => {
  assert.equal(computeRemainingEventCapacity(10, 7), 3);
  assert.equal(computeRemainingEventCapacity(10, 12), 0);
  assert.equal(computeRemainingEventCapacity(null, 3), null);
});

test('club role permissions', () => {
  assert.equal(
    isClubStaff({ role: ClubMembershipRole.MANAGER, status: ClubMembershipStatus.ACTIVE }),
    true,
  );
  assert.equal(
    canLeaveClub({ role: ClubMembershipRole.OWNER, status: ClubMembershipStatus.ACTIVE }),
    false,
  );
  assert.equal(
    canLeaveClub({ role: ClubMembershipRole.MEMBER, status: ClubMembershipStatus.ACTIVE }),
    true,
  );
});
