import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_QUICK_CREATE_DEFAULT_RECRUIT,
  fieldQuickCreateEffectiveReward,
  fieldQuickCreateRequiredLabels,
  isFieldQuickCreateReady,
  resolveFieldCreatePlayersFromParams,
} from './field-join-quick-create';
import { plannedPlayerCountToRecruitCount } from '@jjoin/domain';

test('FIELD quick create defaults to recruit 3 and only five required fields', () => {
  assert.equal(FIELD_QUICK_CREATE_DEFAULT_RECRUIT, 3);
  assert.equal(resolveFieldCreatePlayersFromParams(undefined), 4);
  assert.equal(plannedPlayerCountToRecruitCount(resolveFieldCreatePlayersFromParams('2')), 1);
  assert.equal(resolveFieldCreatePlayersFromParams('6'), 4);
  assert.deepEqual(fieldQuickCreateRequiredLabels(), [
    '골프장',
    '날짜',
    '티타임',
    '그린피',
    '모집 인원',
  ]);
});

test('FIELD quick create is ready only with course, time, recruit, and green fee', () => {
  const base = {
    venueReady: true,
    startAtValid: true,
    recruitCount: 3,
    greenFeePerPerson: 90000,
  };
  assert.equal(isFieldQuickCreateReady(base), true);
  assert.equal(isFieldQuickCreateReady({ ...base, venueReady: false }), false);
  assert.equal(isFieldQuickCreateReady({ ...base, startAtValid: false }), false);
  assert.equal(isFieldQuickCreateReady({ ...base, recruitCount: 4 }), false);
  assert.equal(isFieldQuickCreateReady({ ...base, greenFeePerPerson: null }), false);
  assert.equal(isFieldQuickCreateReady({ ...base, greenFeePerPerson: 0 }), true);
});

test('FIELD quick create keeps Coin at 0 until the host opts in', () => {
  assert.equal(fieldQuickCreateEffectiveReward(false, '500'), '0');
  assert.equal(fieldQuickCreateEffectiveReward(true, '500'), '500');
});
