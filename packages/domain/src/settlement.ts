import { isCoinAmountPositive } from './coin-amount';

/**
 * Participant-level reward settlement helpers.
 * Clock is injectable in tests — production uses UTC system time.
 */

export type SettlementClock = {
  now(): Date;
};

export const systemSettlementClock: SettlementClock = {
  now: () => new Date(),
};

export function computeAutoPayAt(scheduledEndAt: Date, hours = 24): Date {
  return new Date(scheduledEndAt.getTime() + hours * 60 * 60_000);
}

export function isSettlementWindowOpen(scheduledEndAt: Date, now: Date): boolean {
  return now.getTime() >= scheduledEndAt.getTime();
}

export function isAutoPayDue(autoPayAt: Date, now: Date): boolean {
  return now.getTime() >= autoPayAt.getTime();
}

export const TERMINAL_REWARD_STATUSES = [
  'PAID',
  'AUTO_PAID',
  'REFUNDED',
  'NOT_ELIGIBLE',
] as const;

export type TerminalRewardStatus = (typeof TERMINAL_REWARD_STATUSES)[number];

export function isTerminalRewardStatus(status: string): status is TerminalRewardStatus {
  return (TERMINAL_REWARD_STATUSES as readonly string[]).includes(status);
}

export function canHostPayReward(params: {
  now: Date;
  scheduledEndAt: Date;
  rewardStatus: string;
  joinStatus: string;
}): boolean {
  if (params.joinStatus === 'CANCELLED') return false;
  if (!isSettlementWindowOpen(params.scheduledEndAt, params.now)) return false;
  return params.rewardStatus === 'PENDING_CONFIRMATION';
}

export function canAutoPayReward(params: {
  now: Date;
  autoPayAt: Date;
  rewardStatus: string;
}): boolean {
  if (params.rewardStatus !== 'PENDING_CONFIRMATION') return false;
  return isAutoPayDue(params.autoPayAt, params.now);
}

export function blocksAutoPay(rewardStatus: string): boolean {
  return rewardStatus === 'DISPUTED' || rewardStatus === 'NOT_ELIGIBLE' || isTerminalRewardStatus(rewardStatus);
}

export function settlementTransferIdempotencyKey(settlementId: string): string {
  return `settlement:${settlementId}:reward-transfer`;
}

export function settlementRefundIdempotencyKey(settlementId: string): string {
  return `settlement:${settlementId}:reward-refund`;
}

export function settlementRowIdempotencyKey(participantId: string): string {
  return `settlement:participant:${participantId}`;
}

/** Zero-reward joins have no ledger transfer; settlement can close without coin movement. */
export function isRewardTransferRequired(amount: string): boolean {
  return isCoinAmountPositive(amount);
}

export function formatCountdownMs(until: Date, now: Date): number {
  return Math.max(0, until.getTime() - now.getTime());
}
