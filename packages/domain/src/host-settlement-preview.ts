/**
 * Host settlement preview — client displays summary; server computes actual transfers.
 */

import { mulCoinAmountByInt, zeroCoinAmount } from './coin-amount';

export type HostSettlementPreviewParticipant = {
  attended: boolean;
};

export type HostSettlementPreview = {
  attendedCount: number;
  noShowCount: number;
  payoutTotal: string;
  unpaidTotal: string;
  refundToHost: string;
};

/** STANDARD coin join: each attended participant receives rewardPerParticipant. */
export function summarizeStandardHostSettlement(params: {
  rewardPerParticipant: string;
  heldTotal: string;
  participants: HostSettlementPreviewParticipant[];
}): HostSettlementPreview {
  const attendedCount = params.participants.filter((p) => p.attended).length;
  const noShowCount = params.participants.length - attendedCount;
  const payoutTotal = mulCoinAmountByInt(params.rewardPerParticipant, attendedCount);
  const unpaidTotal = mulCoinAmountByInt(params.rewardPerParticipant, noShowCount);

  const heldNum = Number(params.heldTotal);
  const payNum = Number(payoutTotal);
  const refundToHost =
    Number.isFinite(heldNum) && Number.isFinite(payNum) && heldNum >= payNum
      ? String(heldNum - payNum)
      : zeroCoinAmount();

  return {
    attendedCount,
    noShowCount,
    payoutTotal,
    unpaidTotal,
    refundToHost,
  };
}
