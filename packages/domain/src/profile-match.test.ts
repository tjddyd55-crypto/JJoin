import assert from 'node:assert/strict';
import test from 'node:test';
import {
  matchesProfileMatchPreference,
  validateProfileMatchPreference,
  type ProfileMatchPreferenceInput,
} from './profile-match';

const basePref: ProfileMatchPreferenceInput = {
  enabled: true,
  preferredGender: 'FEMALE',
  minAge: 25,
  maxAge: 40,
  minFieldHandicap: 0,
  maxFieldHandicap: 20,
  minScreenHandicap: 0,
  maxScreenHandicap: 18,
  drinkingHabits: ['NONE', 'SOMETIMES'],
  smokingHabits: ['NONE'],
  sido: '서울특별시',
  sigungu: null,
};

test('matcher accepts a host profile inside all ranges', () => {
  assert.equal(
    matchesProfileMatchPreference(basePref, {
      gender: 'FEMALE',
      age: 30,
      fieldHandicap: 12,
      screenHandicap: 8,
      drinking: 'SOMETIMES',
      smoking: 'NONE',
      sido: '서울특별시',
      sigungu: '강남구',
    }),
    true,
  );
});

test('matcher rejects gender, age, handicap, lifestyle, or region misses', () => {
  const candidate = {
    gender: 'FEMALE',
    age: 30,
    fieldHandicap: 12,
    screenHandicap: 8,
    drinking: 'SOMETIMES' as const,
    smoking: 'NONE' as const,
    sido: '서울특별시',
    sigungu: '강남구',
  };
  assert.equal(matchesProfileMatchPreference(basePref, { ...candidate, gender: 'MALE' }), false);
  assert.equal(matchesProfileMatchPreference(basePref, { ...candidate, age: 50 }), false);
  assert.equal(matchesProfileMatchPreference(basePref, { ...candidate, fieldHandicap: 30 }), false);
  assert.equal(matchesProfileMatchPreference(basePref, { ...candidate, drinking: 'OFTEN' }), false);
  assert.equal(matchesProfileMatchPreference(basePref, { ...candidate, sido: '부산광역시' }), false);
  assert.equal(matchesProfileMatchPreference({ ...basePref, enabled: false }, candidate), false);
});

test('empty lifestyle lists mean any; inverted ranges fail validation', () => {
  assert.equal(
    matchesProfileMatchPreference(
      { ...basePref, drinkingHabits: [], smokingHabits: [], preferredGender: 'ANY', sido: null },
      {
        gender: 'MALE',
        age: 30,
        fieldHandicap: 12,
        screenHandicap: 8,
        drinking: null,
        smoking: null,
        sido: null,
        sigungu: null,
      },
    ),
    true,
  );
  assert.equal(
    validateProfileMatchPreference({ ...basePref, minAge: 40, maxAge: 20 }).ok,
    false,
  );
});
