import assert from 'node:assert/strict';
import test from 'node:test';
import { JoinStatus } from '@jjoin/types';
import {
  aggregateFacilityJoinActivity,
  aggregateWeeklyDayCounts,
  buildWeekStrip,
  compareDiscoverJoinOrder,
  compareJoinDiscoveryPriority,
  isOngoingJoin,
  isTodayValidJoin,
  isValidOnSelectedDate,
  kstDayBoundsUtc,
  partitionDiscoverJoins,
  pickHomeHostedJoins,
  resolveDiscoverCanJoin,
  resolveJoinDiscoveryBadge,
  resolveMapJoinCaption,
  sundayOfWeek,
} from './join-discovery';

const TZ = 'Asia/Seoul';

function isoInSeoulDay(dayOffset: number, hour: number, minute = 0): string {
  // Build a Date that lands on Seoul calendar day = today+offset at hour:minute
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, d] = fmt.format(now).split('-').map(Number);
  // noon UTC approx: use Date.UTC then adjust — simpler: use temporal via offset from known Seoul offset
  const base = new Date(Date.UTC(y, m - 1, d + dayOffset, hour - 9, minute, 0));
  return base.toISOString();
}

test('isOngoingJoin: IN_PROGRESS before end', () => {
  const now = new Date('2026-08-26T06:00:00.000Z');
  assert.equal(
    isOngoingJoin({
      status: JoinStatus.IN_PROGRESS,
      startAt: '2026-08-26T05:00:00.000Z',
      scheduledEndAt: '2026-08-26T08:00:00.000Z',
      now,
    }),
    true,
  );
});

test('isOngoingJoin: OPEN inside window', () => {
  const now = new Date('2026-08-26T06:00:00.000Z');
  assert.equal(
    isOngoingJoin({
      status: JoinStatus.OPEN,
      startAt: '2026-08-26T05:00:00.000Z',
      scheduledEndAt: '2026-08-26T08:00:00.000Z',
      now,
    }),
    true,
  );
});

test('isOngoingJoin: excludes CANCELLED and ended', () => {
  const now = new Date('2026-08-26T06:00:00.000Z');
  assert.equal(
    isOngoingJoin({
      status: JoinStatus.CANCELLED,
      startAt: '2026-08-26T05:00:00.000Z',
      scheduledEndAt: '2026-08-26T08:00:00.000Z',
      now,
    }),
    false,
  );
  assert.equal(
    isOngoingJoin({
      status: JoinStatus.OPEN,
      startAt: '2026-08-26T01:00:00.000Z',
      scheduledEndAt: '2026-08-26T02:00:00.000Z',
      now,
    }),
    false,
  );
});

test('isTodayValidJoin: today start, not ended', () => {
  const now = new Date();
  const start = isoInSeoulDay(0, 20, 0);
  const end = isoInSeoulDay(0, 23, 0);
  // if end already past relative to now, bump
  const startDate = new Date(start);
  const endDate = new Date(Math.max(Date.parse(end), now.getTime() + 60 * 60_000));
  assert.equal(
    isTodayValidJoin({
      status: JoinStatus.OPEN,
      startAt: startDate,
      scheduledEndAt: endDate,
      now,
      timeZone: TZ,
    }),
    true,
  );
});

test('isTodayValidJoin: excludes completed today', () => {
  const now = new Date();
  assert.equal(
    isTodayValidJoin({
      status: JoinStatus.COMPLETED,
      startAt: isoInSeoulDay(0, 10, 0),
      scheduledEndAt: isoInSeoulDay(0, 12, 0),
      now,
      timeZone: TZ,
    }),
    false,
  );
});

test('pickHomeHostedJoins: ongoing before later today', () => {
  const now = new Date('2026-08-26T06:00:00.000Z');
  const joins = [
    {
      id: 'later',
      status: JoinStatus.OPEN,
      startAt: '2026-08-26T10:00:00.000Z',
      scheduledEndAt: '2026-08-26T12:00:00.000Z',
    },
    {
      id: 'live',
      status: JoinStatus.IN_PROGRESS,
      startAt: '2026-08-26T05:00:00.000Z',
      scheduledEndAt: '2026-08-26T08:00:00.000Z',
    },
  ];
  const picked = pickHomeHostedJoins(joins, { now, timeZone: 'UTC', limit: 2 });
  assert.equal(picked[0]?.id, 'live');
});

test('compareJoinDiscoveryPriority: ongoing < today upcoming', () => {
  const now = new Date('2026-08-26T06:00:00.000Z');
  const ongoing = {
    status: JoinStatus.OPEN,
    startAt: '2026-08-26T05:00:00.000Z',
    scheduledEndAt: '2026-08-26T08:00:00.000Z',
  };
  const later = {
    status: JoinStatus.OPEN,
    startAt: '2026-08-26T10:00:00.000Z',
    scheduledEndAt: '2026-08-26T12:00:00.000Z',
  };
  assert.ok(compareJoinDiscoveryPriority(ongoing, later, now) < 0);
});

test('aggregateFacilityJoinActivity + map caption', () => {
  const now = new Date('2026-08-26T06:00:00.000Z');
  const activity = aggregateFacilityJoinActivity(
    [
      {
        status: JoinStatus.IN_PROGRESS,
        startAt: '2026-08-26T05:00:00.000Z',
        scheduledEndAt: '2026-08-26T08:00:00.000Z',
      },
      {
        status: JoinStatus.OPEN,
        startAt: '2026-08-26T10:00:00.000Z',
        scheduledEndAt: '2026-08-26T12:00:00.000Z',
      },
    ],
    now,
    'UTC',
  );
  assert.equal(activity.hasOngoingJoin, true);
  assert.equal(activity.hasTodayJoin, true);
  assert.equal(activity.openJoinCount, 2);
  assert.equal(resolveMapJoinCaption(activity), '진행중');
  assert.equal(resolveJoinDiscoveryBadge({
    status: JoinStatus.IN_PROGRESS,
    startAt: '2026-08-26T05:00:00.000Z',
    scheduledEndAt: '2026-08-26T08:00:00.000Z',
    now,
  }).label, '진행 중');
});

test('sundayOfWeek + buildWeekStrip: Sunday start', () => {
  // 2026-08-26 is Wednesday → week Sun 23 … Sat 29
  assert.equal(sundayOfWeek('2026-08-26'), '2026-08-23');
  const strip = buildWeekStrip('2026-08-26', {
    now: new Date('2026-08-26T03:00:00.000Z'),
  });
  assert.equal(strip.length, 7);
  assert.equal(strip[0]?.weekdayLabel, '일');
  assert.equal(strip[0]?.date, '2026-08-23');
  assert.equal(strip[3]?.date, '2026-08-26');
  assert.equal(strip[6]?.date, '2026-08-29');
  assert.equal(strip[3]?.isToday, true);
});

test('sundayOfWeek: month boundary', () => {
  // 2026-08-31 Monday → Sunday 2026-08-30
  assert.equal(sundayOfWeek('2026-08-31'), '2026-08-30');
  // 2026-09-01 Tuesday → Sunday 2026-08-30
  assert.equal(sundayOfWeek('2026-09-01'), '2026-08-30');
});

test('kstDayBoundsUtc: full KST day', () => {
  const { start, end } = kstDayBoundsUtc('2026-08-26');
  assert.equal(start.toISOString(), '2026-08-25T15:00:00.000Z');
  assert.equal(end.toISOString(), '2026-08-26T15:00:00.000Z');
});

test('isValidOnSelectedDate + weekly counts', () => {
  const now = new Date('2026-08-26T06:00:00.000Z');
  const fri = {
    status: JoinStatus.OPEN,
    startAt: '2026-08-28T10:00:00.000Z',
    scheduledEndAt: '2026-08-28T12:00:00.000Z',
  };
  assert.equal(
    isValidOnSelectedDate({ ...fri, dateKey: '2026-08-28', now, timeZone: 'UTC' }),
    true,
  );
  assert.equal(
    isValidOnSelectedDate({ ...fri, dateKey: '2026-08-26', now, timeZone: 'UTC' }),
    false,
  );
  const counts = aggregateWeeklyDayCounts(
    [fri],
    ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29'],
    { now, timeZone: 'UTC' },
  );
  assert.equal(counts['2026-08-28'], 1);
  assert.equal(counts['2026-08-26'], 0);
});

test('partitionDiscoverJoins + compareDiscoverJoinOrder', () => {
  const now = new Date('2026-08-26T06:00:00.000Z');
  const ongoing = {
    status: JoinStatus.OPEN,
    startAt: '2026-08-26T05:00:00.000Z',
    scheduledEndAt: '2026-08-26T08:00:00.000Z',
    distanceMeters: 900,
  };
  const laterNear = {
    status: JoinStatus.OPEN,
    startAt: '2026-08-26T10:00:00.000Z',
    scheduledEndAt: '2026-08-26T12:00:00.000Z',
    distanceMeters: 100,
  };
  const laterFar = {
    status: JoinStatus.OPEN,
    startAt: '2026-08-26T10:00:00.000Z',
    scheduledEndAt: '2026-08-26T12:00:00.000Z',
    distanceMeters: 800,
  };
  const { ongoing: o, upcoming: u } = partitionDiscoverJoins(
    [laterNear, ongoing],
    { dateKey: '2026-08-26', now, timeZone: 'UTC' },
  );
  assert.equal(o.length, 1);
  assert.equal(u.length, 1);
  assert.ok(compareDiscoverJoinOrder(ongoing, laterNear, { now, sort: 'TIME' }) < 0);
  assert.ok(compareDiscoverJoinOrder(laterNear, laterFar, { now, sort: 'TIME' }) < 0);
});

test('resolveDiscoverCanJoin states', () => {
  assert.equal(
    resolveDiscoverCanJoin({
      status: JoinStatus.OPEN,
      currentParticipants: 2,
      maxParticipants: 4,
      isHost: false,
      isParticipant: false,
    }).canJoin,
    true,
  );
  assert.equal(
    resolveDiscoverCanJoin({
      status: JoinStatus.OPEN,
      currentParticipants: 2,
      maxParticipants: 4,
      isHost: true,
      isParticipant: false,
    }).state,
    'HOST',
  );
  assert.equal(
    resolveDiscoverCanJoin({
      status: JoinStatus.FULL,
      currentParticipants: 4,
      maxParticipants: 4,
      isHost: false,
      isParticipant: false,
    }).state,
    'FULL',
  );
});
