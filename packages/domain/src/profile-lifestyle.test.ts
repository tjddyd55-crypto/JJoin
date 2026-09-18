import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyProfilePrivacy,
  formatDrinkingHabitLabel,
  formatSmokingHabitLabel,
  resolvePrimaryPhotoId,
  validateFieldHandicap,
  validateProfileAge,
  validateProfileHeightCm,
} from './profile-lifestyle';

test('profile schema accepts nullable lifestyle and numeric fields', () => {
  assert.deepEqual(validateProfileAge(null), { ok: true, value: null });
  assert.deepEqual(validateProfileHeightCm(undefined), { ok: true, value: null });
  assert.equal(validateProfileAge(17).ok, false);
  assert.equal(validateProfileHeightCm(230).ok, false);
  assert.deepEqual(validateFieldHandicap(12), { ok: true, value: 12 });
  assert.equal(validateFieldHandicap(99).ok, false);
});

test('privacy toggles hide fields for non-owners', () => {
  const hidden = applyProfilePrivacy(
    {
      age: 32,
      heightCm: 178,
      drinking: 'SOMETIMES',
      smoking: 'NONE',
      fieldHandicap: 8,
      screenHandicap: 10,
    },
    {
      showAge: false,
      showHeight: true,
      showDrinking: false,
      showSmoking: true,
      showHandicap: false,
    },
    false,
  );
  assert.equal(hidden.age, null);
  assert.equal(hidden.heightCm, 178);
  assert.equal(hidden.drinking, null);
  assert.equal(hidden.smoking, 'NONE');
  assert.equal(hidden.fieldHandicap, null);
  assert.equal(hidden.screenHandicap, null);
  assert.equal(formatDrinkingHabitLabel('SOMETIMES'), '가끔');
  assert.equal(formatSmokingHabitLabel('E_CIG'), '전자담배');
});

test('primary photo prefers isPrimary then sortOrder', () => {
  assert.equal(
    resolvePrimaryPhotoId([
      { id: 'a', sortOrder: 0, isPrimary: false },
      { id: 'b', sortOrder: 1, isPrimary: true },
    ]),
    'b',
  );
  assert.equal(
    resolvePrimaryPhotoId([
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 0 },
    ]),
    'b',
  );
});
