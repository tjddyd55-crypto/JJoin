import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_AGE_MODE_CHIPS,
  applyFieldAgeMode,
  applyFieldAgeRange,
  defaultFieldAgeCondition,
  fieldAgeConditionPayload,
} from './field-join-age-condition';

test('FIELD age defaults to 무관 and hides bounds in the create payload', () => {
  const initial = defaultFieldAgeCondition();
  assert.equal(initial.ageMode, 'ANY');
  assert.deepEqual(fieldAgeConditionPayload(initial), { minAge: null, maxAge: null });
  assert.deepEqual(
    FIELD_AGE_MODE_CHIPS.map((chip) => chip.label),
    ['나이 무관', '나이 지정'],
  );
});

test('나이 지정 expands the shared range and 무관 clears payload while keeping draft', () => {
  const specified = applyFieldAgeMode(defaultFieldAgeCondition(), 'SPECIFY');
  assert.equal(specified.ageMode, 'SPECIFY');
  assert.deepEqual(fieldAgeConditionPayload(specified), { minAge: 35, maxAge: 49 });

  const moved = applyFieldAgeRange(specified, { minAge: 30, maxAge: 45 });
  assert.deepEqual(fieldAgeConditionPayload(moved), { minAge: 30, maxAge: 45 });

  const anyAgain = applyFieldAgeMode(moved, 'ANY');
  assert.equal(anyAgain.ageMode, 'ANY');
  assert.deepEqual(fieldAgeConditionPayload(anyAgain), { minAge: null, maxAge: null });
  assert.equal(anyAgain.draftMinAge, 30);
  assert.equal(anyAgain.draftMaxAge, 45);
  assert.equal(anyAgain.minAge, null);
  assert.equal(anyAgain.maxAge, null);

  const specifyAgain = applyFieldAgeMode(anyAgain, 'SPECIFY');
  assert.deepEqual(fieldAgeConditionPayload(specifyAgain), { minAge: 30, maxAge: 45 });
});
