/**
 * FIELD round cost — integer KRW only.
 * Completely separate from Coin reward / HOLD / wallet ledger.
 */

export const FIELD_GREEN_FEE_PAYERS = ['EACH_PERSON', 'HOST'] as const;
export type FieldGreenFeePayer = (typeof FIELD_GREEN_FEE_PAYERS)[number];

export const FIELD_SPLIT_FEE_PAYERS = ['EQUAL_SPLIT', 'HOST'] as const;
export type FieldSplitFeePayer = (typeof FIELD_SPLIT_FEE_PAYERS)[number];
export type FieldCartFeePayer = FieldSplitFeePayer;
export type FieldCaddieFeePayer = FieldSplitFeePayer;

export const FIELD_CADDIE_MODES = ['CADDIE', 'NO_CADDIE'] as const;
export type FieldCaddieMode = (typeof FIELD_CADDIE_MODES)[number];

export const FIELD_ROUND_HOLES = [18, 9] as const;
export type FieldRoundHoles = (typeof FIELD_ROUND_HOLES)[number];

export const FIELD_TEE_TIME_MODES = ['CONFIRMED', 'RECRUIT_FIRST', 'SOFT_WINDOW'] as const;
export type FieldTeeTimeMode = (typeof FIELD_TEE_TIME_MODES)[number];
export const FIELD_V1_TEE_TIME_MODE: FieldTeeTimeMode = 'CONFIRMED';

export const FIELD_FEE_MAX_KRW = 2_000_000;
export const FIELD_DEPOSIT_MAX_KRW = 2_000_000;

export type FieldJoinCostInput = {
  greenFeePerPerson?: number | null;
  greenFeePayer?: FieldGreenFeePayer | null;
  cartFeeTotal?: number | null;
  cartFeePayer?: FieldCartFeePayer | null;
  caddieMode?: FieldCaddieMode | null;
  caddieFeeTotal?: number | null;
  caddieFeePayer?: FieldCaddieFeePayer | null;
  participantCount: number;
};

export type FieldJoinCostLineKey = 'GREEN' | 'CART' | 'CADDIE';

export type FieldJoinCostLine = {
  key: FieldJoinCostLineKey;
  label: string;
  participantKrw: number;
  hostKrw: number;
};

export type FieldJoinCostEstimate = {
  participantExpectedKrw: number | null;
  hostExpectedKrw: number | null;
  lines: FieldJoinCostLine[];
};

export type FieldJoinDetailsInput = {
  greenFeePerPerson?: number | null;
  greenFeePayer?: FieldGreenFeePayer | null;
  cartFeeTotal?: number | null;
  cartFeePayer?: FieldCartFeePayer | null;
  caddieMode?: FieldCaddieMode | null;
  caddieFeeTotal?: number | null;
  caddieFeePayer?: FieldCaddieFeePayer | null;
  roundHoles?: FieldRoundHoles | null;
  teeTimeMode?: FieldTeeTimeMode | null;
  minFieldHandicap?: number | null;
  maxFieldHandicap?: number | null;
  depositRequired?: boolean | null;
  depositAmount?: number | null;
  benefitGreenFee?: boolean | null;
  benefitCart?: boolean | null;
  benefitCaddie?: boolean | null;
};

export type FieldJoinDetailsNormalized = {
  greenFeePerPerson: number | null;
  greenFeePayer: FieldGreenFeePayer;
  cartFeeTotal: number | null;
  cartFeePayer: FieldCartFeePayer;
  caddieMode: FieldCaddieMode;
  caddieFeeTotal: number | null;
  caddieFeePayer: FieldCaddieFeePayer | null;
  roundHoles: FieldRoundHoles;
  teeTimeMode: FieldTeeTimeMode;
  minFieldHandicap: number | null;
  maxFieldHandicap: number | null;
  depositRequired: boolean;
  depositAmount: number | null;
  benefitGreenFee: boolean;
  benefitCart: boolean;
  benefitCaddie: boolean;
};

function isPresentFee(value: number | null | undefined): value is number {
  return value != null;
}

function validateOptionalKrw(
  value: number | null | undefined,
  max: number,
  invalidCode: string,
): { ok: true; value: number | null } | { ok: false; code: string } {
  if (value == null) return { ok: true, value: null };
  if (!Number.isInteger(value) || value < 0) return { ok: false, code: invalidCode };
  if (value > max) return { ok: false, code: 'field_fee_exceeds_max' };
  return { ok: true, value };
}

export function splitIntegerKrw(total: number, participantCount: number): {
  perPerson: number;
  hostShare: number;
} {
  const n = participantCount;
  const perPerson = Math.floor(total / n);
  const hostShare = total - perPerson * (n - 1);
  return { perPerson, hostShare };
}

export function estimateFieldJoinCost(input: FieldJoinCostInput): FieldJoinCostEstimate {
  const n = input.participantCount;
  if (!Number.isInteger(n) || n < 1) {
    return { participantExpectedKrw: null, hostExpectedKrw: null, lines: [] };
  }

  const lines: FieldJoinCostLine[] = [];
  const greenPayer = input.greenFeePayer ?? 'EACH_PERSON';
  const cartPayer = input.cartFeePayer ?? 'EQUAL_SPLIT';
  const caddieMode = input.caddieMode ?? 'NO_CADDIE';
  const caddiePayer = input.caddieFeePayer ?? 'EQUAL_SPLIT';

  if (isPresentFee(input.greenFeePerPerson)) {
    if (greenPayer === 'HOST') {
      lines.push({
        key: 'GREEN',
        label: '그린피',
        participantKrw: 0,
        hostKrw: input.greenFeePerPerson * n,
      });
    } else {
      lines.push({
        key: 'GREEN',
        label: '그린피',
        participantKrw: input.greenFeePerPerson,
        hostKrw: input.greenFeePerPerson,
      });
    }
  }

  if (isPresentFee(input.cartFeeTotal)) {
    if (cartPayer === 'HOST') {
      lines.push({
        key: 'CART',
        label: '카트비',
        participantKrw: 0,
        hostKrw: input.cartFeeTotal,
      });
    } else {
      const split = splitIntegerKrw(input.cartFeeTotal, n);
      lines.push({
        key: 'CART',
        label: '카트비',
        participantKrw: split.perPerson,
        hostKrw: split.hostShare,
      });
    }
  }

  if (caddieMode === 'CADDIE' && isPresentFee(input.caddieFeeTotal)) {
    if (caddiePayer === 'HOST') {
      lines.push({
        key: 'CADDIE',
        label: '캐디피',
        participantKrw: 0,
        hostKrw: input.caddieFeeTotal,
      });
    } else {
      const split = splitIntegerKrw(input.caddieFeeTotal, n);
      lines.push({
        key: 'CADDIE',
        label: '캐디피',
        participantKrw: split.perPerson,
        hostKrw: split.hostShare,
      });
    }
  }

  if (lines.length === 0) {
    return { participantExpectedKrw: null, hostExpectedKrw: null, lines };
  }

  return {
    participantExpectedKrw: lines.reduce((sum, line) => sum + line.participantKrw, 0),
    hostExpectedKrw: lines.reduce((sum, line) => sum + line.hostKrw, 0),
    lines,
  };
}

export function formatFieldExpectedCostLabel(krw: number | null | undefined): string | null {
  if (krw == null || !Number.isInteger(krw) || krw < 0) return null;
  return `예상 ${krw.toLocaleString('ko-KR')}원`;
}

export function formatFieldGreenFeePayerLabel(payer: FieldGreenFeePayer): string {
  return payer === 'HOST' ? '호스트 부담' : '각자 부담';
}

export function formatFieldSplitFeePayerLabel(payer: FieldSplitFeePayer): string {
  return payer === 'HOST' ? '호스트 부담' : '균등 분담';
}

export function formatFieldCaddieModeLabel(mode: FieldCaddieMode): string {
  return mode === 'CADDIE' ? '캐디' : '노캐디';
}

export function formatFieldRoundHolesLabel(holes: FieldRoundHoles): string {
  return `${holes}홀`;
}

export function validateFieldJoinDetails(
  input: FieldJoinDetailsInput & { participantCount: number },
):
  | { ok: true; value: FieldJoinDetailsNormalized; estimate: FieldJoinCostEstimate }
  | { ok: false; code: string } {
  const participantCount = input.participantCount;
  if (!Number.isInteger(participantCount) || participantCount < 1) {
    return { ok: false, code: 'field_participant_count_required' };
  }

  const greenFee = validateOptionalKrw(
    input.greenFeePerPerson,
    FIELD_FEE_MAX_KRW,
    'invalid_field_green_fee',
  );
  if (!greenFee.ok) return greenFee;

  const cartFee = validateOptionalKrw(input.cartFeeTotal, FIELD_FEE_MAX_KRW, 'invalid_field_cart_fee');
  if (!cartFee.ok) return cartFee;

  const greenFeePayer = input.greenFeePayer ?? 'EACH_PERSON';
  if (!FIELD_GREEN_FEE_PAYERS.includes(greenFeePayer)) {
    return { ok: false, code: 'invalid_field_green_fee_payer' };
  }
  const cartFeePayer = input.cartFeePayer ?? 'EQUAL_SPLIT';
  if (!FIELD_SPLIT_FEE_PAYERS.includes(cartFeePayer)) {
    return { ok: false, code: 'invalid_field_cart_fee_payer' };
  }

  const caddieMode = input.caddieMode ?? 'NO_CADDIE';
  if (!FIELD_CADDIE_MODES.includes(caddieMode)) {
    return { ok: false, code: 'invalid_field_caddie_mode' };
  }

  const caddieFee = validateOptionalKrw(
    input.caddieFeeTotal,
    FIELD_FEE_MAX_KRW,
    'invalid_field_caddie_fee',
  );
  if (!caddieFee.ok) return caddieFee;

  if (caddieMode === 'NO_CADDIE') {
    if (caddieFee.value != null && caddieFee.value !== 0) {
      return { ok: false, code: 'field_nocaddie_fee_must_be_zero' };
    }
  }

  const caddieFeePayer = input.caddieFeePayer ?? (caddieMode === 'CADDIE' ? 'EQUAL_SPLIT' : null);
  if (caddieFeePayer != null && !FIELD_SPLIT_FEE_PAYERS.includes(caddieFeePayer)) {
    return { ok: false, code: 'invalid_field_caddie_fee_payer' };
  }

  const roundHoles = input.roundHoles ?? 18;
  if (!FIELD_ROUND_HOLES.includes(roundHoles)) {
    return { ok: false, code: 'invalid_field_round_holes' };
  }

  const teeTimeMode = input.teeTimeMode ?? FIELD_V1_TEE_TIME_MODE;
  if (!FIELD_TEE_TIME_MODES.includes(teeTimeMode)) {
    return { ok: false, code: 'invalid_field_tee_time_mode' };
  }
  if (teeTimeMode !== FIELD_V1_TEE_TIME_MODE) {
    return { ok: false, code: 'field_tee_time_must_be_confirmed' };
  }

  const minHandicap = input.minFieldHandicap ?? null;
  const maxHandicap = input.maxFieldHandicap ?? null;
  if (minHandicap != null || maxHandicap != null) {
    if (minHandicap == null || maxHandicap == null) {
      return { ok: false, code: 'field_handicap_range_required' };
    }
    if (!Number.isInteger(minHandicap) || !Number.isInteger(maxHandicap)) {
      return { ok: false, code: 'invalid_field_handicap_range' };
    }
    if (minHandicap > maxHandicap) {
      return { ok: false, code: 'invalid_field_handicap_range' };
    }
  }

  const depositRequired = input.depositRequired === true;
  const deposit = validateOptionalKrw(
    input.depositAmount,
    FIELD_DEPOSIT_MAX_KRW,
    'invalid_field_deposit_amount',
  );
  if (!deposit.ok) return deposit;
  if (depositRequired && (deposit.value == null || deposit.value <= 0)) {
    return { ok: false, code: 'field_deposit_amount_required' };
  }
  if (!depositRequired && deposit.value != null && deposit.value !== 0) {
    return { ok: false, code: 'field_deposit_not_enabled' };
  }

  const value: FieldJoinDetailsNormalized = {
    greenFeePerPerson: greenFee.value,
    greenFeePayer,
    cartFeeTotal: cartFee.value,
    cartFeePayer,
    caddieMode,
    caddieFeeTotal: caddieMode === 'NO_CADDIE' ? null : caddieFee.value,
    caddieFeePayer: caddieMode === 'NO_CADDIE' ? null : caddieFeePayer,
    roundHoles,
    teeTimeMode,
    minFieldHandicap: minHandicap,
    maxFieldHandicap: maxHandicap,
    depositRequired,
    depositAmount: depositRequired ? deposit.value : null,
    benefitGreenFee: input.benefitGreenFee === true,
    benefitCart: input.benefitCart === true,
    benefitCaddie: input.benefitCaddie === true,
  };

  const estimate = estimateFieldJoinCost({
    greenFeePerPerson: value.greenFeePerPerson,
    greenFeePayer: value.greenFeePayer,
    cartFeeTotal: value.cartFeeTotal,
    cartFeePayer: value.cartFeePayer,
    caddieMode: value.caddieMode,
    caddieFeeTotal: value.caddieFeeTotal,
    caddieFeePayer: value.caddieFeePayer,
    participantCount,
  });

  return { ok: true, value, estimate };
}

export function defaultFieldJoinDetails(): FieldJoinDetailsNormalized {
  return {
    greenFeePerPerson: null,
    greenFeePayer: 'EACH_PERSON',
    cartFeeTotal: null,
    cartFeePayer: 'EQUAL_SPLIT',
    caddieMode: 'NO_CADDIE',
    caddieFeeTotal: null,
    caddieFeePayer: null,
    roundHoles: 18,
    teeTimeMode: FIELD_V1_TEE_TIME_MODE,
    minFieldHandicap: null,
    maxFieldHandicap: null,
    depositRequired: false,
    depositAmount: null,
    benefitGreenFee: false,
    benefitCart: false,
    benefitCaddie: false,
  };
}
