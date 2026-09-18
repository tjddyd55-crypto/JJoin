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
    greenFeePayer: value.greenFeePayer as FieldGreenFeePayer,
    cartFeeTotal: value.cartFeeTotal,
    cartFeePayer: value.cartFeePayer as FieldCartFeePayer,
    caddieMode: value.caddieMode as FieldCaddieMode,
    caddieFeeTotal: value.caddieMode === 'NO_CADDIE' ? null : value.caddieFeeTotal,
    caddieFeePayer:
      value.caddieMode === 'NO_CADDIE' ? null : (value.caddieFeePayer as FieldCaddieFeePayer | null),
    roundHoles: value.roundHoles,
    teeTimeMode: FieldTeeTimeMode.CONFIRMED,
    minFieldHandicap: value.minFieldHandicap,
    maxFieldHandicap: value.maxFieldHandicap,
    depositRequired: false,
    depositAmount: null,
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
