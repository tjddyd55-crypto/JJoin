import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatHmDisplay,
  minuteOptionsForValue,
  normalizeHourMinute,
  parseHm,
} from './kst-time';
import { composeKstIso } from '../../features/store/matching-join-ui';

test('normalizeHourMinute pads and accepts bounds', () => {
  assert.deepEqual(normalizeHourMinute(9, 0), {
    ok: true,
    hour: 9,
    minute: 0,
    hm: '09:00',
  });
  assert.deepEqual(normalizeHourMinute('19', '30'), {
    ok: true,
    hour: 19,
    minute: 30,
    hm: '19:30',
  });
  assert.deepEqual(normalizeHourMinute(7, 5), {
    ok: true,
    hour: 7,
    minute: 5,
    hm: '07:05',
  });
  assert.deepEqual(normalizeHourMinute('23', '50'), {
    ok: true,
    hour: 23,
    minute: 50,
    hm: '23:50',
  });
});

test('normalizeHourMinute rejects invalid bounds and empty', () => {
  assert.equal(normalizeHourMinute(24, 0).ok, false);
  assert.equal(normalizeHourMinute(19, 60).ok, false);
  assert.equal(normalizeHourMinute('', 0).ok, false);
  assert.equal(normalizeHourMinute(9, '').ok, false);
  assert.equal(normalizeHourMinute(-1, 0).ok, false);
});

test('parseHm and display keep HH:mm SSOT', () => {
  assert.deepEqual(parseHm('19:30'), { hour: 19, minute: 30 });
  assert.equal(formatHmDisplay('19:30'), '19시 30분');
  assert.equal(parseHm('25:00'), null);
});

test('minuteOptionsForValue preserves off-step prefill', () => {
  assert.deepEqual(minuteOptionsForValue(5), [0, 5, 10, 20, 30, 40, 50]);
  assert.deepEqual(minuteOptionsForValue(30), [0, 10, 20, 30, 40, 50]);
});

test('composeKstIso with normalized time has no day shift', () => {
  const normalized = normalizeHourMinute(19, 30);
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;
  const iso = composeKstIso('2026-09-12', normalized.hm);
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  assert.equal(day, '2026-09-12');
});
