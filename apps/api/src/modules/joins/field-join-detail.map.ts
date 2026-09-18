import {
  estimateFieldJoinCost,
  resolveFieldRoundHoles,
  type FieldCaddieMode,
  type FieldGreenFeePayer,
  type FieldSplitFeePayer,
  type FieldTeeTimeMode,
} from '@jjoin/domain';
import {
  FieldCaddieFeePayer,
  FieldCaddieMode as FieldCaddieModeEnum,
  FieldCartFeePayer,
  FieldGreenFeePayer as FieldGreenFeePayerEnum,
  FieldTeeTimeMode as FieldTeeTimeModeEnum,
  type FieldJoinDetailDto,
} from '@jjoin/types';

export type FieldJoinDetailRow = {
  greenFeePerPerson: number | null;
  greenFeePayer: string;
  cartFeeTotal: number | null;
  cartFeePayer: string;
  caddieMode: string;
  caddieFeeTotal: number | null;
  caddieFeePayer: string | null;
  roundHoles: number;
  teeTimeMode: string;
  minFieldHandicap: number | null;
  maxFieldHandicap: number | null;
  depositRequired: boolean;
  depositAmount: number | null;
};

export function mapFieldJoinDetailDto(
  row: FieldJoinDetailRow | null | undefined,
  participantCount: number,
): FieldJoinDetailDto | null {
  if (!row) return null;
  const greenFeePayer = row.greenFeePayer as FieldGreenFeePayer;
  const cartFeePayer = row.cartFeePayer as FieldSplitFeePayer;
  const caddieMode = row.caddieMode as FieldCaddieMode;
  const caddieFeePayer = (row.caddieFeePayer as FieldSplitFeePayer | null) ?? null;
  const cost = estimateFieldJoinCost({
    greenFeePerPerson: row.greenFeePerPerson,
    greenFeePayer,
    cartFeeTotal: row.cartFeeTotal,
    cartFeePayer,
    caddieMode,
    caddieFeeTotal: row.caddieFeeTotal,
    caddieFeePayer,
    participantCount,
  });
  return {
    greenFeePerPerson: row.greenFeePerPerson,
    greenFeePayer: greenFeePayer as FieldGreenFeePayerEnum,
    cartFeeTotal: row.cartFeeTotal,
    cartFeePayer: cartFeePayer as FieldCartFeePayer,
    caddieMode: caddieMode as FieldCaddieModeEnum,
    caddieFeeTotal: row.caddieFeeTotal,
    caddieFeePayer: caddieFeePayer as FieldCaddieFeePayer | null,
    roundHoles: resolveFieldRoundHoles(row.roundHoles),
    teeTimeMode: row.teeTimeMode as FieldTeeTimeModeEnum,
    minFieldHandicap: row.minFieldHandicap,
    maxFieldHandicap: row.maxFieldHandicap,
    depositRequired: row.depositRequired,
    depositAmount: row.depositAmount,
    cost,
  };
}

export function fieldJoinDetailCreateData(
  joinId: string,
  detailId: string,
  value: {
    greenFeePerPerson: number | null;
    greenFeePayer: FieldGreenFeePayer;
    cartFeeTotal: number | null;
    cartFeePayer: FieldSplitFeePayer;
    caddieMode: FieldCaddieMode;
    caddieFeeTotal: number | null;
    caddieFeePayer: FieldSplitFeePayer | null;
    roundHoles: 18 | 9;
    teeTimeMode: FieldTeeTimeMode;
    minFieldHandicap: number | null;
    maxFieldHandicap: number | null;
    depositRequired: boolean;
    depositAmount: number | null;
  },
) {
  return {
    id: detailId,
    joinId,
    greenFeePerPerson: value.greenFeePerPerson,
    greenFeePayer: value.greenFeePayer,
    cartFeeTotal: value.cartFeeTotal,
    cartFeePayer: value.cartFeePayer,
    caddieMode: value.caddieMode,
    caddieFeeTotal: value.caddieFeeTotal,
    caddieFeePayer: value.caddieFeePayer,
    roundHoles: value.roundHoles,
    teeTimeMode: value.teeTimeMode,
    minFieldHandicap: value.minFieldHandicap,
    maxFieldHandicap: value.maxFieldHandicap,
    depositRequired: value.depositRequired,
    depositAmount: value.depositAmount,
  };
}
