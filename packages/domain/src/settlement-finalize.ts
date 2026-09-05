/**
 * Host batch finalize helpers — retry/idempotency planning (SSOT).
 * Actual coin movement remains server-side; this documents safe retry semantics.
 */

import { isTerminalRewardStatus } from './settlement';

export type FinalizeSettlementRow = {
  participantId: string;
  rewardStatus: string;
};

export type FinalizeAttendanceItem = {
  participantId: string;
  attended: boolean;
};

/** Attended payouts first so shared HOLD is not drained by no-show refunds. */
export function sortFinalizeAttendanceForProcessing(
  attendance: FinalizeAttendanceItem[],
): FinalizeAttendanceItem[] {
  return [...attendance].sort((a, b) => {
    if (a.attended === b.attended) return 0;
    return a.attended ? -1 : 1;
  });
}

/**
 * Rows still requiring ledger movement on retry.
 * Terminal statuses (PAID, REFUNDED, …) are skipped — prevents double payout/refund.
 */
export function pickFinalizeRowsToProcess(
  attendance: FinalizeAttendanceItem[],
  settlements: FinalizeSettlementRow[],
): FinalizeAttendanceItem[] {
  const statusByParticipant = new Map(
    settlements.map((row) => [row.participantId, row.rewardStatus]),
  );
  const ordered = sortFinalizeAttendanceForProcessing(attendance);
  return ordered.filter((item) => {
    const status = statusByParticipant.get(item.participantId);
    if (!status) return true;
    return !isTerminalRewardStatus(status);
  });
}
