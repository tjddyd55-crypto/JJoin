import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeAttendanceReliability,
  formatTodayJoinableBadge,
  isJoinCapacityJoinable,
} from './attendance-reliability';
import {
  matchesJoinAlertSubscription,
  newJoinableNotificationEventKey,
  createJoinShareSlug,
} from './join-engagement';

test('attendance rate COMPLETED/(COMPLETED+NO_SHOW)', () => {
  const r = computeAttendanceReliability({ completedCount: 18, noShowCount: 0 });
  assert.equal(r.attendanceRatePercent, 100);
  const r2 = computeAttendanceReliability({ completedCount: 9, noShowCount: 1 });
  assert.equal(r2.attendanceRatePercent, 90);
  const empty = computeAttendanceReliability({ completedCount: 0, noShowCount: 0 });
  assert.equal(empty.attendanceRate, null);
});

test('joinable capacity excludes FULL and over capacity', () => {
  assert.equal(
    isJoinCapacityJoinable({
      status: 'OPEN',
      currentParticipants: 2,
      maxParticipants: 4,
    }),
    true,
  );
  assert.equal(
    isJoinCapacityJoinable({
      status: 'FULL',
      currentParticipants: 4,
      maxParticipants: 4,
    }),
    false,
  );
});

test('today joinable badge', () => {
  assert.equal(formatTodayJoinableBadge(0), null);
  assert.equal(formatTodayJoinableBadge(2), '2');
  assert.equal(formatTodayJoinableBadge(12), '9+');
});

test('alert subscription matches district + today + evening', () => {
  const evening = new Date();
  // Build a KST evening start: today 19:00 KST = 10:00 UTC
  const todayKeyParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(evening);
  const [y, m, d] = todayKeyParts.split('-').map(Number);
  const startAt = new Date(Date.UTC(y!, m! - 1, d!, 10, 0, 0)); // 19:00 KST
  assert.equal(
    matchesJoinAlertSubscription(
      {
        dateMode: 'TODAY',
        timeBand: 'EVENING',
        joinableOnly: true,
        sido: '경기도',
        sigungu: '고양시 일산동구',
      },
      {
        startAt,
        status: 'OPEN',
        currentParticipants: 1,
        maxParticipants: 4,
        sido: '경기도',
        sigungu: '고양시 일산동구',
      },
      evening,
    ),
    true,
  );
  assert.equal(
    matchesJoinAlertSubscription(
      {
        dateMode: 'TODAY',
        timeBand: 'MORNING',
        joinableOnly: true,
        sido: '경기도',
        sigungu: '고양시 일산동구',
      },
      {
        startAt,
        status: 'OPEN',
        currentParticipants: 1,
        maxParticipants: 4,
        sido: '경기도',
        sigungu: '고양시 일산동구',
      },
      evening,
    ),
    false,
  );
});

test('shared new-joinable event key', () => {
  assert.equal(
    newJoinableNotificationEventKey('u1', 'j1'),
    'user-new-joinable:u1:j1',
  );
});

test('share slug from bytes', () => {
  const slug = createJoinShareSlug(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
  assert.equal(slug.length, 8);
});
