/**
 * DEV-only policy probe for FIELD host-selection + SCREEN regression.
 *
 *   JJOIN_API_BASE_URL=https://... pnpm exec tsx scripts/field-join-real-world-ux-dev-e2e.ts
 *
 * Scenarios A–G are evaluated as domain/validation policies.
 * Does not write Production data, Toss payments, or real coin balances.
 */
import { applyJoinSchema, createJoinSchema } from '../packages/validation/src/index.ts';
import {
  canApplyToFieldJoin,
  canCancelFieldParticipation,
  canConfirmFieldApplicant,
  countFieldApplications,
  countFieldConfirmedApplicants,
  formatFieldGreenFeeLabel,
  formatFieldSelectedBenefitsLabel,
  hasFieldCoinBenefit,
  isFieldDongFilterToken,
  matchesFieldCityCounty,
  normalizeFieldCityCounty,
  validateFieldApplicationNote,
  validateFieldGenderRecruit,
  validateFieldRecruitCount,
  validateJoinCapacityForTrack,
} from '../packages/domain/src/index.ts';

function requireOk(ok: boolean, label: string): void {
  if (!ok) throw new Error(label);
}

const venueId = '11111111-1111-4111-8111-111111111111';
const startAt = new Date(Date.now() + 36 * 60 * 60_000).toISOString();

// A — recruit 3
requireOk(validateFieldRecruitCount(3).ok, 'A: recruit 3');
requireOk(
  createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 4,
    recruitCount: 3,
    joinMethod: 'APPROVAL',
    venueType: 'FIELD',
    fieldDetails: { greenFeePerPerson: 90000, benefitGreenFee: true, benefitCart: true },
  }).success,
  'A: FIELD create recruit 3',
);

// B — 7 applicants, confirmed 2
const seven = [
  { role: 'HOST', participationStatus: 'APPROVED', gender: 'MALE' as const },
  { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
  { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'FEMALE' as const },
  ...Array.from({ length: 5 }, () => ({
    role: 'PARTICIPANT',
    participationStatus: 'APPLIED',
    gender: 'MALE' as const,
  })),
];
requireOk(countFieldApplications(seven) === 7, 'B: 7 applications');
requireOk(countFieldConfirmedApplicants(seven) === 2, 'B: confirmed 2');
requireOk(canApplyToFieldJoin({ joinStatus: 'OPEN' }).ok, 'B: more applications allowed');

// C — confirm 3 then 4th reject
const full = [
  ...seven.slice(0, 3),
  { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
];
requireOk(
  !canConfirmFieldApplicant({
    recruitCount: 3,
    applicantStatus: 'APPLIED',
    applicantGender: 'MALE',
    participants: full,
  }).ok,
  'C: 4th confirm rejected',
);

// D — gender composition
requireOk(
  validateFieldGenderRecruit({
    recruitCount: 3,
    mode: 'FIXED',
    maleRecruitCount: 2,
    femaleRecruitCount: 1,
  }).ok,
  'D: gender 2+1',
);

// E — waitlist/apply after full
requireOk(canApplyToFieldJoin({ joinStatus: 'FULL' }).ok, 'E: apply after confirmed full');
requireOk(!canApplyToFieldJoin({ applicationsClosed: true }).ok, 'E: host close blocks apply');

// F — cancel + reselect
const afterCancel = [
  { role: 'HOST', participationStatus: 'APPROVED', gender: 'MALE' as const },
  { role: 'PARTICIPANT', participationStatus: 'CANCELLED' },
  { role: 'PARTICIPANT', participationStatus: 'APPLIED', gender: 'FEMALE' as const },
];
requireOk(
  canCancelFieldParticipation({ role: 'PARTICIPANT', participationStatus: 'APPROVED' }).ok,
  'F: confirmed can cancel',
);
requireOk(countFieldConfirmedApplicants(afterCancel) === 0, 'F: confirmed decreased');
requireOk(
  canConfirmFieldApplicant({
    recruitCount: 3,
    applicantStatus: 'APPLIED',
    applicantGender: 'FEMALE',
    participants: afterCancel,
  }).ok,
  'F: host can reselect',
);

// G — SCREEN regression
requireOk(
  validateJoinCapacityForTrack({
    playFormat: 'INDIVIDUAL',
    plannedPlayerCount: 6,
    venueType: 'SCREEN',
  }).ok,
  'G: SCREEN 6',
);
requireOk(
  !createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 6,
    joinMethod: 'OPEN',
    venueType: 'SCREEN',
    fieldDetails: { greenFeePerPerson: 80000 },
  }).success,
  'G: SCREEN rejects fieldDetails',
);

requireOk(validateFieldApplicationNote('잘 부탁드려요').ok, 'application note');
requireOk(applyJoinSchema.safeParse({ note: '잘 부탁드려요' }).success, 'apply DTO');
requireOk(formatFieldGreenFeeLabel(90000) === '그린피 90,000원', 'green fee label');
requireOk(hasFieldCoinBenefit('500'), 'coin stays on reward SSOT');
requireOk(
  (formatFieldSelectedBenefitsLabel({
    benefits: { benefitGreenFee: true, benefitCart: false, benefitCaddie: false },
    rewardPerParticipant: '500',
  }) ?? '').includes('+500C'),
  'benefits + coin copy',
);
requireOk(!isFieldDongFilterToken('용인시'), 'city is not dong');
requireOk(isFieldDongFilterToken('양지면'), 'myeon is dong-level');
requireOk(
  matchesFieldCityCounty({
    rowSido: '경기도',
    rowSigungu: '용인시 처인구',
    targetProvince: '경기',
    targetCityCounty: '용인시',
  }),
  'province→city/county match',
);
requireOk(normalizeFieldCityCounty('강원', '춘천시 신동면').cityCounty === '춘천시', 'strip myeon');

async function maybeProbeLiveApi(): Promise<void> {
  const apiBase = process.env.JJOIN_API_BASE_URL?.replace(/\/$/, '');
  if (!apiBase) {
    console.log('[FIELD-UX-E2E] SKIP live API — A–G policies passed');
    return;
  }
  const health = await fetch(`${apiBase}/health`).catch(() => null);
  if (!health || !health.ok) {
    console.log('[FIELD-UX-E2E] SKIP live API health — A–G policies passed');
    return;
  }
  console.log('[FIELD-UX-E2E] live API health ok — apply/confirm still need a DEV session');
}

console.log('[FIELD-UX-E2E] A–G host-selection / benefits / region policies passed');
void maybeProbeLiveApi();
