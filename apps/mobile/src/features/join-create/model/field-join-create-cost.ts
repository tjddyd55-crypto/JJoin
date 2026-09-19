import {
  defaultFieldJoinDetails,
  estimateFieldJoinCost,
  validateFieldJoinDetails,
  type FieldJoinDetailsNormalized,
} from '@jjoin/domain';
import {
  FieldCaddieFeePayer,
  FieldCaddieMode,
  FieldCartFeePayer,
  FieldGreenFeePayer,
  FieldTeeTimeMode,
  type FieldJoinDetailsInput,
} from '@jjoin/types';

export type FieldJoinCreateCostState = FieldJoinDetailsNormalized;

export function defaultFieldJoinCreateCost(): FieldJoinCreateCostState {
  return defaultFieldJoinDetails();
}

export function fieldJoinCostPayload(value: FieldJoinCreateCostState): FieldJoinDetailsInput {
  return {
    greenFeePerPerson: value.greenFeePerPerson,
    greenFeePayer: FieldGreenFeePayer.EACH_PERSON,
    cartFeeTotal: null,
    cartFeePayer: FieldCartFeePayer.EQUAL_SPLIT,
    caddieMode: FieldCaddieMode.NO_CADDIE,
    caddieFeeTotal: null,
    caddieFeePayer: null,
    roundHoles: 18,
    teeTimeMode: FieldTeeTimeMode.CONFIRMED,
    minFieldHandicap: value.minFieldHandicap,
    maxFieldHandicap: value.maxFieldHandicap,
    depositRequired: false,
    depositAmount: null,
    benefitGreenFee: value.benefitGreenFee,
    benefitCart: value.benefitCart,
    benefitCaddie: value.benefitCaddie,
  };
}

export function parseOptionalKrwInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number(digits);
}

export function fieldJoinCostEstimate(value: FieldJoinCreateCostState, participantCount: number) {
  return estimateFieldJoinCost({
    ...value,
    participantCount,
  });
}

export function isFieldJoinCostValid(
  value: FieldJoinCreateCostState,
  participantCount: number,
): boolean {
  return validateFieldJoinDetails({ ...value, participantCount }).ok;
}
