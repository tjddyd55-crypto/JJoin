import assert from 'node:assert/strict';
import test from 'node:test';
import { formatKstDatePickerLabel } from './kst-date-format';
import { composeKstIso } from '../../features/store/matching-join-ui';

test('formatKstDatePickerLabel uses Korean friendly format', () => {
  const label = formatKstDatePickerLabel('2026-09-12');
  assert.match(label, /2026/);
  assert.match(label, /09/);
  assert.match(label, /12/);
});

test('composeKstIso keeps KST storage SSOT', () => {
  const iso = composeKstIso('2026-09-12', '19:00');
  assert.ok(iso.includes('T'));
});
