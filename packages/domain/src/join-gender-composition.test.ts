import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canApproveStandardGenderSlot,
  countStandardGenderRoster,
  formatStandardGenderCompositionLabel,
  hasFixedGenderComposition,
  normalizeFixedGenderComposition,
  parseGenderCompositionPayload,
  validateFixedGenderComposition,
  validateStandardGenderCompositionEdit,
} from './join-gender-composition';

const hostMale = { role: 'HOST', participationStatus: 'APPROVED', gender: 'MALE' as const };

test('normalizeFixedGenderComposition keeps male + female = total', () => {
  assert.deepEqual(normalizeFixedGenderComposition(4, 2), {
    targetMaleCount: 2,
    targetFemaleCount: 2,
  });
  assert.deepEqual(normalizeFixedGenderComposition(4, 1), {
    targetMaleCount: 1,
    targetFemaleCount: 3,
  });
});

test('male host allows male1 female3 through male4 female0', () => {
  for (const male of [1, 2, 3, 4]) {
    const female = 4 - male;
    assert.equal(
      validateFixedGenderComposition({
        totalCapacity: 4,
        targetMaleCount: male,
        targetFemaleCount: female,
        hostGender: 'MALE',
      }).ok,
      true,
    );
  }
});

test('male host rejects male0 female4', () => {
  assert.deepEqual(
    validateFixedGenderComposition({
      totalCapacity: 4,
      targetMaleCount: 0,
      targetFemaleCount: 4,
      hostGender: 'MALE',
    }),
    { ok: false, code: 'host_gender_quota_required' },
  );
});

test('female host rejects male4 female0', () => {
  assert.deepEqual(
    validateFixedGenderComposition({
      totalCapacity: 4,
      targetMaleCount: 4,
      targetFemaleCount: 0,
      hostGender: 'FEMALE',
    }),
    { ok: false, code: 'host_gender_quota_required' },
  );
});

test('canApproveStandardGenderSlot blocks male when male quota full', () => {
  const targets = { targetMaleCount: 2, targetFemaleCount: 2 };
  const participants = [
    hostMale,
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'FEMALE' as const },
  ];
  assert.equal(
    canApproveStandardGenderSlot({
      applicantGender: 'MALE',
      ...targets,
      participants,
      hostGender: 'MALE',
    }),
    false,
  );
  assert.equal(
    canApproveStandardGenderSlot({
      applicantGender: 'FEMALE',
      ...targets,
      participants,
      hostGender: 'MALE',
    }),
    true,
  );
});

test('validateStandardGenderCompositionEdit blocks shrinking below current roster', () => {
  assert.equal(
    validateStandardGenderCompositionEdit({
      targetMaleCount: 1,
      targetFemaleCount: 3,
      currentMaleCount: 2,
      currentFemaleCount: 1,
    }).ok,
    false,
  );
});

test('parseGenderCompositionPayload ANY clears targets', () => {
  assert.deepEqual(
    parseGenderCompositionPayload({
      genderCompositionMode: 'ANY',
      plannedPlayerCount: 4,
      targetMaleCount: 2,
      targetFemaleCount: 2,
    }),
    { targetMaleCount: null, targetFemaleCount: null },
  );
});

test('formatStandardGenderCompositionLabel formats fixed composition', () => {
  assert.equal(formatStandardGenderCompositionLabel(2, 2), '남 2 / 여 2');
  assert.equal(formatStandardGenderCompositionLabel(null, null), null);
  assert.equal(hasFixedGenderComposition(null, null), false);
});

test('countStandardGenderRoster includes host gender in totals', () => {
  assert.deepEqual(
    countStandardGenderRoster({
      participants: [hostMale],
      hostGender: 'MALE',
    }),
    { male: 1, female: 0, other: 0, total: 1 },
  );
});
