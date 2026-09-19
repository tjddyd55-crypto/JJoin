import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatFieldCardRecruitLine,
  formatFieldGreenFeeLabel,
  formatFieldSelectedBenefitsLabel,
  hasFieldCoinBenefit,
  normalizeFieldJoinBenefits,
} from './field-join-benefits';

test('user-facing KRW is green fee only', () => {
  assert.equal(formatFieldGreenFeeLabel(90000), '그린피 90,000원');
  assert.equal(formatFieldGreenFeeLabel(null), null);
});

test('KRW benefits stay informational and never become coin amounts', () => {
  const benefits = normalizeFieldJoinBenefits({
    benefitGreenFee: true,
    benefitCart: true,
    benefitCaddie: false,
  });
  assert.equal(
    formatFieldSelectedBenefitsLabel({
      benefits,
      rewardPerParticipant: '500',
    }),
    '그린피 지원 · 카트 지원 · +500C',
  );
  assert.equal(hasFieldCoinBenefit('0'), false);
  assert.equal(hasFieldCoinBenefit('500'), true);
});

test('card recruit line is recruit + applications', () => {
  assert.equal(formatFieldCardRecruitLine({ recruitCount: 3, applicationCount: 9 }), '모집 3 · 신청 9');
});
