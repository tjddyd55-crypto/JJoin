import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canApplyToFieldJoin,
  canConfirmFieldApplicant,
  countFieldApplications,
  countFieldConfirmedApplicants,
  formatFieldGreenFeeLabel,
  formatFieldSelectedBenefitsLabel,
  hasFieldCoinBenefit,
  matchesFieldCityCounty,
  normalizeFieldCityCounty,
} from '@jjoin/domain';
import { applyJoinSchema, createJoinSchema } from '@jjoin/validation';

const venueId = '11111111-1111-4111-8111-111111111111';
const startAt = '2026-09-20T01:00:00.000Z';

test('FIELD create uses recruit 3 + green fee + benefits without a second coin model', () => {
  const parsed = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 4,
    recruitCount: 3,
    joinMethod: 'APPROVAL',
    venueType: 'FIELD',
    rewardPerParticipant: '500',
    genderCompositionMode: 'FIXED',
    targetMaleCount: 2,
    targetFemaleCount: 1,
    fieldDetails: {
      greenFeePerPerson: 90000,
      benefitGreenFee: true,
      benefitCart: true,
      benefitCaddie: false,
    },
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.recruitCount, 3);
  assert.equal(parsed.data.fieldDetails?.greenFeePerPerson, 90000);
  assert.equal(parsed.data.fieldDetails?.benefitCart, true);
  assert.equal(hasFieldCoinBenefit(parsed.data.rewardPerParticipant), true);
  assert.equal(formatFieldGreenFeeLabel(90000), '그린피 90,000원');
  assert.match(
    formatFieldSelectedBenefitsLabel({
      benefits: parsed.data.fieldDetails,
      rewardPerParticipant: parsed.data.rewardPerParticipant,
    }) ?? '',
    /그린피 지원/,
  );
});

test('applications stay open after confirmed == recruit and gender blocks confirm only', () => {
  const participants = [
    { role: 'HOST', participationStatus: 'APPROVED', gender: 'MALE' as const },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'FEMALE' as const },
    ...Array.from({ length: 4 }, () => ({
      role: 'PARTICIPANT',
      participationStatus: 'APPLIED',
      gender: 'FEMALE' as const,
    })),
  ];
  assert.equal(countFieldApplications(participants), 7);
  assert.equal(countFieldConfirmedApplicants(participants), 3);
  assert.equal(canApplyToFieldJoin({ joinStatus: 'FULL' }).ok, true);
  assert.equal(
    canConfirmFieldApplicant({
      recruitCount: 3,
      applicantStatus: 'APPLIED',
      applicantGender: 'FEMALE',
      genderMode: 'FIXED',
      maleRecruitCount: 2,
      femaleRecruitCount: 1,
      participants,
    }).ok,
    false,
  );
});

test('apply note and FIELD region city/county stay validated', () => {
  assert.equal(applyJoinSchema.safeParse({ note: '잘 부탁드려요' }).success, true);
  assert.deepEqual(normalizeFieldCityCounty('경기', '용인시 처인구 양지면'), {
    province: '경기도',
    cityCounty: '용인시',
  });
  assert.equal(
    matchesFieldCityCounty({
      rowSido: '경기도',
      rowSigungu: '용인시',
      targetProvince: '경기도',
      targetCityCounty: '용인시',
    }),
    true,
  );
});

test('SCREEN create still accepts 6 and rejects FIELD fees', () => {
  const screen = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 6,
    joinMethod: 'OPEN',
    venueType: 'SCREEN',
  });
  assert.equal(screen.success, true);
  const mixed = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 6,
    joinMethod: 'OPEN',
    venueType: 'SCREEN',
    fieldDetails: { greenFeePerPerson: 80000 },
  });
  assert.equal(mixed.success, false);
});
