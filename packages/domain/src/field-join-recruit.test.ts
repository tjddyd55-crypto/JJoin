import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canApplyToFieldJoin,
  canCancelFieldParticipation,
  canConfirmFieldApplicant,
  countFieldApplications,
  countFieldConfirmedApplicants,
  fieldGenderConfirmHint,
  formatFieldRecruitSummary,
  mapFieldParticipationFaceLabel,
  plannedPlayerCountToRecruitCount,
  recruitCountToPlannedPlayerCount,
  resolveFieldRecruitCount,
  validateFieldApplicationNote,
  validateFieldGenderRecruit,
  validateFieldRecruitCount,
  type FieldRecruitParticipant,
} from './field-join-recruit';

const host: FieldRecruitParticipant = {
  role: 'HOST',
  participationStatus: 'APPROVED',
  gender: 'MALE',
};

test('FIELD recruit is 1/2/3 and maps to planned 2/3/4 including host', () => {
  assert.deepEqual(
    [1, 2, 3].map((n) => recruitCountToPlannedPlayerCount(n)),
    [2, 3, 4],
  );
  assert.equal(plannedPlayerCountToRecruitCount(4), 3);
  assert.equal(validateFieldRecruitCount(4).ok, false);
  assert.equal(resolveFieldRecruitCount({ recruitCount: 3 }).ok, true);
  assert.equal(resolveFieldRecruitCount({ plannedPlayerCount: 4 }).ok, true);
  assert.equal(resolveFieldRecruitCount({ plannedPlayerCount: 6 }).ok, false);
});

test('applications stay allowed after confirmed == recruitCount', () => {
  const participants: FieldRecruitParticipant[] = [
    host,
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'FEMALE' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' },
  ];
  assert.equal(countFieldConfirmedApplicants(participants), 3);
  assert.equal(canApplyToFieldJoin({ joinStatus: 'FULL' }).ok, true);
  assert.equal(canApplyToFieldJoin({ applicationsClosed: true }).ok, false);
  assert.equal(
    canConfirmFieldApplicant({
      recruitCount: 3,
      applicantStatus: 'APPLIED',
      applicantGender: 'MALE',
      participants,
    }).ok,
    false,
  );
});

test('recruit 3 can collect 7+ applications while confirmed stays at 2', () => {
  const applicants: FieldRecruitParticipant[] = [
    host,
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'FEMALE' },
    ...Array.from({ length: 5 }, () => ({
      role: 'PARTICIPANT',
      participationStatus: 'APPLIED',
      gender: 'MALE' as const,
    })),
  ];
  assert.equal(countFieldApplications(applicants), 7);
  assert.equal(countFieldConfirmedApplicants(applicants), 2);
  assert.equal(
    formatFieldRecruitSummary({
      recruitCount: 3,
      applicationCount: countFieldApplications(applicants),
      confirmedCount: countFieldConfirmedApplicants(applicants),
    }),
    '모집 3 · 신청 7 · 확정 2',
  );
});

test('host selection never auto-confirms; confirm is explicit and gender-capped', () => {
  const participants: FieldRecruitParticipant[] = [
    host,
    { role: 'PARTICIPANT', participationStatus: 'APPLIED', gender: 'MALE' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' },
  ];
  const blocked = canConfirmFieldApplicant({
    recruitCount: 3,
    applicantStatus: 'APPLIED',
    applicantGender: 'MALE',
    genderMode: 'FIXED',
    maleRecruitCount: 2,
    femaleRecruitCount: 1,
    participants,
  });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.equal(blocked.code, 'GENDER_SLOT_FULL');

  const femaleOk = canConfirmFieldApplicant({
    recruitCount: 3,
    applicantStatus: 'APPLIED',
    applicantGender: 'FEMALE',
    genderMode: 'FIXED',
    maleRecruitCount: 2,
    femaleRecruitCount: 1,
    participants: [
      ...participants,
      { role: 'PARTICIPANT', participationStatus: 'APPLIED', gender: 'FEMALE' },
    ],
  });
  assert.equal(femaleOk.ok, true);
});

test('gender recruit sums to recruitCount and does not consume host gender', () => {
  const ok = validateFieldGenderRecruit({
    recruitCount: 3,
    mode: 'FIXED',
    maleRecruitCount: 2,
    femaleRecruitCount: 1,
  });
  assert.equal(ok.ok, true);
  const mismatch = validateFieldGenderRecruit({
    recruitCount: 3,
    mode: 'FIXED',
    maleRecruitCount: 3,
    femaleRecruitCount: 1,
  });
  assert.equal(mismatch.ok, false);
});

test('confirmed cancel frees a seat so host can select another applicant', () => {
  const afterCancel: FieldRecruitParticipant[] = [
    host,
    { role: 'PARTICIPANT', participationStatus: 'CANCELLED' },
    { role: 'PARTICIPANT', participationStatus: 'APPLIED', gender: 'FEMALE' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' },
  ];
  assert.equal(countFieldConfirmedApplicants(afterCancel), 1);
  assert.equal(countFieldApplications(afterCancel), 2);
  assert.equal(
    canConfirmFieldApplicant({
      recruitCount: 3,
      applicantStatus: 'APPLIED',
      applicantGender: 'FEMALE',
      participants: afterCancel,
    }).ok,
    true,
  );
});

test('application note is optional and capped', () => {
  assert.equal(validateFieldApplicationNote(null).ok, true);
  assert.equal(validateFieldApplicationNote('잘 부탁드려요').ok, true);
  assert.equal(validateFieldApplicationNote('x'.repeat(81)).ok, false);
});

test('face labels map the host-selection lifecycle', () => {
  assert.equal(mapFieldParticipationFaceLabel({ participationStatus: 'APPLIED' }), '신청');
  assert.equal(
    mapFieldParticipationFaceLabel({
      participationStatus: 'APPLIED',
      hostReviewStatus: 'ON_HOLD',
    }),
    '보류',
  );
  assert.equal(mapFieldParticipationFaceLabel({ participationStatus: 'APPROVED' }), '확정');
  assert.equal(
    mapFieldParticipationFaceLabel({
      participationStatus: 'CANCELLED',
      hostReviewStatus: 'REJECTED',
    }),
    '미선정',
  );
  assert.equal(mapFieldParticipationFaceLabel({ participationStatus: 'CANCELLED' }), '신청 취소');
});

test('gender confirm hints stay user-facing', () => {
  const participants: FieldRecruitParticipant[] = [
    host,
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' },
  ];
  assert.equal(
    fieldGenderConfirmHint({
      applicantGender: 'MALE',
      recruitCount: 3,
      genderMode: 'FIXED',
      maleRecruitCount: 2,
      femaleRecruitCount: 1,
      participants,
    }),
    '해당 성별 자리 마감',
  );
  assert.equal(
    fieldGenderConfirmHint({
      applicantGender: 'FEMALE',
      recruitCount: 3,
      genderMode: 'FIXED',
      maleRecruitCount: 2,
      femaleRecruitCount: 1,
      participants,
    }),
    '여성 자리 남음',
  );
});

test('confirmed cancel is allowed and host can reselect remaining applicants', () => {
  assert.equal(canCancelFieldParticipation({ role: 'PARTICIPANT', participationStatus: 'APPROVED' }).ok, true);
  assert.equal(canCancelFieldParticipation({ role: 'HOST', participationStatus: 'APPROVED' }).ok, false);
  const afterCancel: FieldRecruitParticipant[] = [
    host,
    { role: 'PARTICIPANT', participationStatus: 'CANCELLED' },
    { role: 'PARTICIPANT', participationStatus: 'APPLIED', gender: 'FEMALE' },
  ];
  assert.equal(countFieldConfirmedApplicants(afterCancel), 0);
  assert.equal(
    canConfirmFieldApplicant({
      recruitCount: 3,
      applicantStatus: 'APPLIED',
      applicantGender: 'FEMALE',
      participants: afterCancel,
    }).ok,
    true,
  );
});
