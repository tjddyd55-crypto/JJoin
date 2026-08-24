/**
 * Join create reward-per-participant input helpers.
 * Single SSOT value: rewardPerParticipant (integer string for mobile UI).
 */

import { compareCoinAmounts, subCoinAmounts } from './coin-amount';

/** Quick-add denominations — UI config only, not business policy. */
export const REWARD_QUICK_ADD_DENOMINATIONS = [1, 5, 10, 50, 100] as const;

const MAX_REWARD_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

/** Normalize manual numeric input: digits only, no leading zeros, empty → "0". */
export function normalizeRewardPerParticipantInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '0';
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return '0';
  return String(Math.min(parsed, MAX_REWARD_SAFE_INTEGER));
}

/** Additive quick-increment on current reward (never below 0). */
export function addRewardQuickIncrement(current: string, delta: number): string {
  if (!Number.isInteger(delta) || delta < 0) {
    throw new Error('quick_add_delta_must_be_non_negative_integer');
  }
  const base = Number.parseInt(normalizeRewardPerParticipantInput(current), 10);
  const next = Math.min(MAX_REWARD_SAFE_INTEGER, base + delta);
  return String(next);
}

/** Returns shortfall amount when available < required; null when sufficient. */
export function computeCoinShortfall(available: string, required: string): string | null {
  if (compareCoinAmounts(available, required) >= 0) return null;
  return subCoinAmounts(required, available);
}

/** Wallet available after deducting total required (preview display only). */
export function computeWalletAfterCreation(available: string, totalRequired: string): string {
  if (compareCoinAmounts(available, totalRequired) < 0) {
    return '0';
  }
  return subCoinAmounts(available, totalRequired);
}
