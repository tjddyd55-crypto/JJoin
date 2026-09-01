import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canChangeMemberRole,
  canPromoteClubManager,
  canMemberUpdateAttendanceResponse,
  summarizeMemberAttendanceRows,
} from './club-management';
import { kstYearStartUtc, rolling30DayStartUtc } from './club-stats-period';
import { ClubMembershipRole, ClubMembershipStatus } from '@jjoin/types';

test('canPromoteClubManager allows owner only', () => {
  assert.equal(
    canPromoteClubManager({ role: ClubMembershipRole.OWNER, status: ClubMembershipStatus.ACTIVE }),
    true,
  );
  assert.equal(
    canPromoteClubManager({ role: ClubMembershipRole.MANAGER, status: ClubMembershipStatus.ACTIVE }),
    false,
  );
});

test('canChangeMemberRole blocks owner target', () => {
  const owner = { role: ClubMembershipRole.OWNER, status: ClubMembershipStatus.ACTIVE };
  const member = { role: ClubMembershipRole.MEMBER, status: ClubMembershipStatus.ACTIVE };
  assert.equal(canChangeMemberRole(owner, member), true);
  assert.equal(canChangeMemberRole(owner, owner), false);
});

test('canMemberUpdateAttendanceResponse respects deadline', () => {
  const member = { role: ClubMembershipRole.MEMBER, status: ClubMembershipStatus.ACTIVE };
  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);
  assert.equal(canMemberUpdateAttendanceResponse(member, future), true);
  assert.equal(canMemberUpdateAttendanceResponse(member, past), false);
});

test('summarizeMemberAttendanceRows uses shared denominator policy', () => {
  const summary = summarizeMemberAttendanceRows([
    { response: 'ATTENDING', finalStatus: 'ATTENDED' },
    { response: 'ATTENDING', finalStatus: 'NO_SHOW' },
    { response: 'DECLINED' },
  ]);
  assert.equal(summary.attended, 1);
  assert.equal(summary.noShow, 1);
  assert.equal(summary.declined, 1);
  assert.equal(summary.averageAttendanceRate, 50);
});

test('kstYearStartUtc aligns to Asia/Seoul year boundary', () => {
  const start = kstYearStartUtc(new Date('2026-03-01T00:00:00+09:00'));
  assert.equal(start.toISOString(), '2025-12-31T15:00:00.000Z');
});

test('rolling30DayStartUtc uses KST calendar rolling window', () => {
  const now = new Date('2026-03-01T12:00:00+09:00');
  const start = rolling30DayStartUtc(now);
  assert.ok(start.getTime() < now.getTime());
});
