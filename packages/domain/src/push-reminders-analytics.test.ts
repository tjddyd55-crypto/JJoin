import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attendanceReminderCopy,
  attendanceReminderEventKey,
  isJoinInAttendanceReminderWindow,
} from './attendance-reminder';
import { shouldDeliverPushForType, DEFAULT_NOTIFICATION_PREFERENCES } from './notification-preferences';
import { computeCtr, recommendationImpressionDedupeKey } from './product-analytics';
import { normalizeAppVariant, appVariantToDb } from './app-variant';

test('attendanceReminderEventKey is stable', () => {
  assert.equal(
    attendanceReminderEventKey('24h', 'u1', 'j1'),
    'attendance-reminder-24h:u1:j1',
  );
});

test('24h window captures join starting in ~24 hours', () => {
  const now = new Date('2026-08-31T10:00:00.000Z');
  const start24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  assert.equal(isJoinInAttendanceReminderWindow(start24h, now, '24h'), true);
  const start12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  assert.equal(isJoinInAttendanceReminderWindow(start12h, now, '24h'), false);
});

test('3h window captures join starting in ~3 hours', () => {
  const now = new Date('2026-08-31T10:00:00.000Z');
  const start3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  assert.equal(isJoinInAttendanceReminderWindow(start3h, now, '3h'), true);
});

test('attendanceReminderCopy differs for PENDING vs CONFIRMED', () => {
  const pending = attendanceReminderCopy('3h', 'Venue A', 'PENDING');
  const confirmed = attendanceReminderCopy('3h', 'Venue A', 'CONFIRMED');
  assert.notEqual(pending.title, confirmed.title);
  assert.match(pending.title, /참석/);
});

test('shouldDeliverPushForType respects granular prefs', () => {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, urgentJoinEnabled: false };
  assert.equal(shouldDeliverPushForType('URGENT_JOIN_OPENED', prefs, true), false);
  assert.equal(shouldDeliverPushForType('JOIN_ALERT_MATCH', prefs, true), true);
});

test('shouldDeliverPushForType respects master switch', () => {
  assert.equal(
    shouldDeliverPushForType('JOIN_ALERT_MATCH', DEFAULT_NOTIFICATION_PREFERENCES, false),
    false,
  );
});

test('computeCtr', () => {
  assert.equal(computeCtr(2, 10), 20);
  assert.equal(computeCtr(0, 0), null);
});

test('recommendationImpressionDedupeKey', () => {
  assert.equal(
    recommendationImpressionDedupeKey('u', 'j', 'home'),
    'rec-impression:u:j:home',
  );
});

test('appVariant normalization', () => {
  assert.equal(normalizeAppVariant('development'), 'development');
  assert.equal(normalizeAppVariant('prod'), 'production');
  assert.equal(appVariantToDb('development'), 'DEVELOPMENT');
});
