/**
 * User→user coin gift — reuses wallet/ledger/idempotency.
 * Transfer only (never issuance). Available balance only.
 */

import { isCoinAmountPositive } from './coin-amount';

export const COIN_GIFT_LEDGER_TYPE = 'COIN_GIFT';
export const COIN_GIFT_REF_TYPE = 'COIN_GIFT';

export type CoinGiftValidationInput = {
  fromUserId: string;
  toUserId: string;
  amount: string;
  availableBalance: string;
};

export type CoinGiftValidationResult =
  | { ok: true }
  | { ok: false; code: 'self_gift_forbidden' | 'invalid_gift_amount' | 'insufficient_available' };

export function validateCoinGift(input: CoinGiftValidationInput): CoinGiftValidationResult {
  if (!input.fromUserId || !input.toUserId || input.fromUserId === input.toUserId) {
    return { ok: false, code: 'self_gift_forbidden' };
  }
  if (!isCoinAmountPositive(input.amount)) {
    return { ok: false, code: 'invalid_gift_amount' };
  }
  const available = Number(input.availableBalance);
  const amount = Number(input.amount);
  if (!Number.isFinite(available) || !Number.isFinite(amount) || available < amount) {
    return { ok: false, code: 'insufficient_available' };
  }
  return { ok: true };
}

export function coinGiftDebitIdempotencyKey(clientKey: string): string {
  return `coin-gift:${clientKey}:debit`;
}

export function coinGiftCreditIdempotencyKey(clientKey: string): string {
  return `coin-gift:${clientKey}:credit`;
}

export function normalizeGiftIdempotencyKey(clientKey: string, fromUserId: string): string {
  return `coin-gift:${fromUserId}:${clientKey.trim()}`;
}
