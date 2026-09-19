/**
 * FIELD host-promised benefits — informational KRW promises + existing Coin reward.
 * Never mix KRW benefits into the Coin ledger.
 */

export const FIELD_BENEFIT_KEYS = ['GREEN_FEE', 'CART', 'CADDIE', 'COIN'] as const;
export type FieldBenefitKey = (typeof FIELD_BENEFIT_KEYS)[number];

export type FieldJoinBenefits = {
  benefitGreenFee: boolean;
  benefitCart: boolean;
  benefitCaddie: boolean;
};

export const FIELD_BENEFIT_LABELS: Record<Exclude<FieldBenefitKey, 'COIN'>, string> = {
  GREEN_FEE: '그린피 지원',
  CART: '카트 지원',
  CADDIE: '캐디 지원',
};

export function defaultFieldJoinBenefits(): FieldJoinBenefits {
  return {
    benefitGreenFee: false,
    benefitCart: false,
    benefitCaddie: false,
  };
}

export function normalizeFieldJoinBenefits(
  input?: Partial<FieldJoinBenefits> | null,
): FieldJoinBenefits {
  return {
    benefitGreenFee: input?.benefitGreenFee === true,
    benefitCart: input?.benefitCart === true,
    benefitCaddie: input?.benefitCaddie === true,
  };
}

export function selectedFieldKrwBenefitLabels(benefits: FieldJoinBenefits): string[] {
  const labels: string[] = [];
  if (benefits.benefitGreenFee) labels.push(FIELD_BENEFIT_LABELS.GREEN_FEE);
  if (benefits.benefitCart) labels.push(FIELD_BENEFIT_LABELS.CART);
  if (benefits.benefitCaddie) labels.push(FIELD_BENEFIT_LABELS.CADDIE);
  return labels;
}

export function hasFieldCoinBenefit(rewardPerParticipant: string | number | null | undefined): boolean {
  const n = Number(rewardPerParticipant);
  return Number.isFinite(n) && n > 0;
}

export function formatFieldGreenFeeLabel(krw: number | null | undefined): string | null {
  if (krw == null || !Number.isInteger(krw) || krw < 0) return null;
  return `그린피 ${krw.toLocaleString('ko-KR')}원`;
}

export function formatFieldCoinBenefitLabel(
  rewardPerParticipant: string | number | null | undefined,
): string | null {
  const n = Number(rewardPerParticipant);
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Number.isInteger(n) ? String(n) : String(n);
  return `+${rounded}C`;
}

export function formatFieldSelectedBenefitsLabel(params: {
  benefits?: Partial<FieldJoinBenefits> | null;
  rewardPerParticipant?: string | number | null;
}): string | null {
  const labels = selectedFieldKrwBenefitLabels(normalizeFieldJoinBenefits(params.benefits));
  const coin = formatFieldCoinBenefitLabel(params.rewardPerParticipant);
  if (coin) labels.push(coin);
  return labels.length > 0 ? labels.join(' · ') : null;
}

export function formatFieldCardRecruitLine(params: {
  recruitCount: number;
  applicationCount: number;
}): string {
  return `모집 ${params.recruitCount} · 신청 ${params.applicationCount}`;
}
