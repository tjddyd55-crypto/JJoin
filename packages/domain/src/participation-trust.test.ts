import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateParticipationTrust } from './participation-trust';

test('low sample returns NEW without harsh caution', () => {
  const trust = calculateParticipationTrust({
    joinedCount: 1,
    attendedCount: 0,
    noShowCount: 1,
  });
  assert.equal(trust.label, 'NEW');
  assert.equal(trust.labelText, '신규');
});

test('stable attendance rate', () => {
  const trust = calculateParticipationTrust({
    joinedCount: 12,
    attendedCount: 11,
    noShowCount: 1,
  });
  assert.equal(trust.attendanceRatePercent, 91.7);
  assert.equal(trust.label, 'STABLE');
});

test('very stable with high rate and enough sample', () => {
  const trust = calculateParticipationTrust({
    joinedCount: 20,
    attendedCount: 19,
    noShowCount: 1,
  });
  assert.equal(trust.label, 'VERY_STABLE');
});

test('caution requires sufficient sample and poor rate', () => {
  const trust = calculateParticipationTrust({
    joinedCount: 10,
    attendedCount: 3,
    noShowCount: 7,
  });
  assert.equal(trust.label, 'CAUTION');
});
