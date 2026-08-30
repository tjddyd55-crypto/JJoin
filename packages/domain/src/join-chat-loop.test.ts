import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_POLL_INTERVAL_MS,
  CHAT_PURGE_AFTER_HOURS,
  CHAT_VISIBLE_GRACE_HOURS,
  JOIN_INVITE_MAX_BATCH,
  PLAYED_TOGETHER_ELIGIBLE_STATUS,
  canAccessJoinChat,
  canActivateUrgentVacancy,
  joinInvitationNotificationEventKey,
  normalizeChatMessageBody,
  resolveChatRoomLifecycleStatus,
  shouldClearUrgent,
  urgentJoinNotificationEventKey,
} from './join-chat-loop';

function kstTodayAtUtcHour(utcHour: number, now = new Date()): Date {
  const key = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, utcHour, 0, 0));
}

test('constants', () => {
  assert.equal(CHAT_VISIBLE_GRACE_HOURS, 24);
  assert.equal(CHAT_PURGE_AFTER_HOURS, 48);
  assert.equal(CHAT_MESSAGE_MAX_LENGTH, 1000);
  assert.equal(CHAT_POLL_INTERVAL_MS, 5000);
  assert.equal(JOIN_INVITE_MAX_BATCH, 20);
  assert.equal(PLAYED_TOGETHER_ELIGIBLE_STATUS, 'COMPLETED');
});

test('canActivateUrgentVacancy — today KST, before start, seats, joinable', () => {
  const now = new Date();
  // Today 20:00 KST = 11:00 UTC
  const startAt = kstTodayAtUtcHour(11, now);
  // Ensure start is in the future relative to a morning now if needed
  const morning = kstTodayAtUtcHour(1, now); // 10:00 KST
  assert.equal(
    canActivateUrgentVacancy({
      status: 'OPEN',
      startAt,
      plannedPlayerCount: 4,
      confirmedPlayerCount: 2,
      now: morning,
    }),
    true,
  );
  assert.equal(
    canActivateUrgentVacancy({
      status: 'FULL',
      startAt,
      plannedPlayerCount: 4,
      confirmedPlayerCount: 4,
      now: morning,
    }),
    false,
  );
  assert.equal(
    canActivateUrgentVacancy({
      status: 'OPEN',
      startAt,
      plannedPlayerCount: 4,
      confirmedPlayerCount: 4,
      now: morning,
    }),
    false,
  );
  assert.equal(
    canActivateUrgentVacancy({
      status: 'CANCELLED',
      startAt,
      plannedPlayerCount: 4,
      confirmedPlayerCount: 1,
      now: morning,
    }),
    false,
  );
});

test('shouldClearUrgent when full / past start / seats gone', () => {
  const now = new Date('2026-08-31T01:00:00.000Z');
  const startAt = new Date('2026-08-31T05:00:00.000Z');
  assert.equal(
    shouldClearUrgent({
      isUrgent: true,
      status: 'FULL',
      planned: 4,
      confirmed: 4,
      startAt,
      now,
    }),
    true,
  );
  assert.equal(
    shouldClearUrgent({
      isUrgent: true,
      status: 'OPEN',
      planned: 4,
      confirmed: 4,
      startAt,
      now,
    }),
    true,
    'seats filled (confirmed === planned) clears urgent even if status still OPEN',
  );
  assert.equal(
    shouldClearUrgent({
      isUrgent: true,
      status: 'OPEN',
      planned: 4,
      confirmed: 2,
      startAt,
      now,
      urgentUntil: new Date('2026-08-31T00:30:00.000Z'),
    }),
    true,
  );
  assert.equal(
    shouldClearUrgent({
      isUrgent: true,
      status: 'OPEN',
      planned: 4,
      confirmed: 2,
      startAt,
      now,
      urgentUntil: startAt,
    }),
    false,
  );
  assert.equal(
    shouldClearUrgent({
      isUrgent: false,
      status: 'OPEN',
      planned: 4,
      confirmed: 2,
      startAt,
      now,
    }),
    false,
  );
});

test('canAccessJoinChat host / approved / declined', () => {
  assert.equal(
    canAccessJoinChat({ role: 'HOST', participationStatus: 'APPROVED' }),
    true,
  );
  assert.equal(
    canAccessJoinChat({
      role: 'PARTICIPANT',
      participationStatus: 'APPROVED',
      attendanceIntent: 'CONFIRMED',
    }),
    true,
  );
  assert.equal(
    canAccessJoinChat({
      role: 'PARTICIPANT',
      participationStatus: 'APPROVED',
      attendanceIntent: 'DECLINED',
    }),
    false,
  );
  assert.equal(
    canAccessJoinChat({ role: 'PARTICIPANT', participationStatus: 'APPLIED' }),
    false,
  );
  assert.equal(
    canAccessJoinChat({ role: 'PARTICIPANT', participationStatus: 'CANCELLED' }),
    false,
  );
});

test('resolveChatRoomLifecycleStatus', () => {
  const end = new Date('2026-08-31T10:00:00.000Z');
  assert.equal(
    resolveChatRoomLifecycleStatus('OPEN', new Date('2026-08-31T09:00:00.000Z'), end),
    'ACTIVE',
  );
  assert.equal(
    resolveChatRoomLifecycleStatus('COMPLETED', new Date('2026-08-31T11:00:00.000Z'), end),
    'READ_ONLY',
  );
  assert.equal(
    resolveChatRoomLifecycleStatus('CANCELLED', new Date('2026-08-31T11:00:00.000Z'), end),
    'READ_ONLY',
  );
  assert.equal(
    resolveChatRoomLifecycleStatus(
      'COMPLETED',
      new Date('2026-09-02T11:00:00.000Z'),
      end,
    ),
    'CLOSED',
  );
  assert.equal(
    resolveChatRoomLifecycleStatus(
      'CANCELLED',
      new Date('2026-09-02T11:00:00.000Z'),
      end,
    ),
    'CLOSED',
  );
  assert.equal(
    resolveChatRoomLifecycleStatus('OPEN', new Date('2026-08-31T11:00:00.000Z'), end),
    'READ_ONLY',
  );
  // Exactly at purge boundary → CLOSED
  assert.equal(
    resolveChatRoomLifecycleStatus(
      'COMPLETED',
      new Date(end.getTime() + CHAT_PURGE_AFTER_HOURS * 60 * 60_000),
      end,
    ),
    'CLOSED',
  );
});

test('normalizeChatMessageBody', () => {
  assert.equal(normalizeChatMessageBody('  hello  '), 'hello');
  assert.throws(() => normalizeChatMessageBody('   '), /chat_message_empty/);
  assert.throws(() => normalizeChatMessageBody(''), /chat_message_empty/);
  assert.throws(
    () => normalizeChatMessageBody('x'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1)),
    /chat_message_too_long/,
  );
  assert.equal(
    normalizeChatMessageBody('x'.repeat(CHAT_MESSAGE_MAX_LENGTH)).length,
    CHAT_MESSAGE_MAX_LENGTH,
  );
  // XSS / HTML is stored as plain text — not stripped, not executed by domain.
  const html = '<script>alert(1)</script>';
  assert.equal(normalizeChatMessageBody(html), html);
});

test('invite / urgent event keys', () => {
  assert.equal(urgentJoinNotificationEventKey('u1', 'j1'), 'urgent-join:u1:j1');
  assert.equal(
    joinInvitationNotificationEventKey('u1', 'inv1'),
    'join-invite:u1:inv1',
  );
});
