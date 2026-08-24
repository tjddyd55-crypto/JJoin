/**
 * Coin Supply accounting — pure helpers.
 *
 * Identity (must always hold):
 *   TOTAL_ISSUED − TOTAL_BURNED = CURRENT_SUPPLY
 *   CURRENT_SUPPLY = TOTAL_AVAILABLE + TOTAL_HELD
 *
 * Transfer / Hold / Release / Refund do not change TOTAL_ISSUED or TOTAL_BURNED.
 */

import {
  addCoinAmounts,
  compareCoinAmounts,
  subCoinAmounts,
  zeroCoinAmount,
} from './coin-amount';

/** Ledger economic effect for supply accounting. */
export type CoinSupplyEffect =
  | 'ISSUANCE'
  | 'BURN'
  | 'HOLD'
  | 'RELEASE'
  | 'TRANSFER'
  | 'REFUND'
  | 'IGNORE';

/**
 * Classify a ledger row for supply math.
 * Legacy ADMIN_ADJUSTMENT CREDIT counts as ISSUANCE (pre-CoinIssuance backfill).
 */
export function classifyCoinSupplyEffect(
  type: string,
  direction: 'DEBIT' | 'CREDIT' | string,
): CoinSupplyEffect {
  if (type === 'COIN_ISSUANCE' && direction === 'CREDIT') return 'ISSUANCE';
  if (type === 'ADMIN_ADJUSTMENT' && direction === 'CREDIT') return 'ISSUANCE';
  if (type === 'ROOM_CREATION_FEE' && direction === 'DEBIT') return 'BURN';
  if (type === 'JOIN_REWARD_HOLD' && direction === 'DEBIT') return 'HOLD';
  if (type === 'JOIN_REWARD_RELEASE' && direction === 'DEBIT') return 'RELEASE';
  if (type === 'JOIN_REWARD_TRANSFER' && direction === 'CREDIT') return 'TRANSFER';
  if (type === 'JOIN_REWARD_REFUND' && direction === 'CREDIT') return 'REFUND';
  return 'IGNORE';
}

export function isIssuanceLedgerType(type: string): boolean {
  return type === 'COIN_ISSUANCE' || type === 'ADMIN_ADJUSTMENT';
}

export function isBurnLedgerType(type: string): boolean {
  return type === 'ROOM_CREATION_FEE';
}

export type SupplyTotals = {
  totalIssued: string;
  totalBurned: string;
  totalAvailable: string;
  totalHeld: string;
};

export type SupplyIdentityResult = {
  ok: boolean;
  currentSupplyFromBooks: string;
  currentSupplyFromWallets: string;
  delta: string;
};

/**
 * Verify:
 *   issued − burned == available + held
 */
export function verifySupplyIdentity(totals: SupplyTotals): SupplyIdentityResult {
  const fromBooks = subCoinAmounts(totals.totalIssued, totals.totalBurned);
  const fromWallets = addCoinAmounts(totals.totalAvailable, totals.totalHeld);
  const cmp = compareCoinAmounts(fromBooks, fromWallets);
  let delta = zeroCoinAmount();
  if (cmp > 0) {
    delta = subCoinAmounts(fromBooks, fromWallets);
  } else if (cmp < 0) {
    delta = subCoinAmounts(fromWallets, fromBooks);
  }
  return {
    ok: cmp === 0,
    currentSupplyFromBooks: fromBooks,
    currentSupplyFromWallets: fromWallets,
    delta,
  };
}

export function currentSupply(totalIssued: string, totalBurned: string): string {
  return subCoinAmounts(totalIssued, totalBurned);
}

/** Sum issuance amounts, optionally excluding DEV_SEED for production KPI. */
export function sumIssuanceByType(
  rows: Array<{ issuanceType: string; amount: string }>,
  options?: { excludeDevSeed?: boolean },
): { total: string; byType: Record<string, string> } {
  const byType: Record<string, string> = {};
  let total = zeroCoinAmount();
  for (const row of rows) {
    if (options?.excludeDevSeed && row.issuanceType === 'DEV_SEED') continue;
    byType[row.issuanceType] = addCoinAmounts(byType[row.issuanceType] ?? '0', row.amount);
    total = addCoinAmounts(total, row.amount);
  }
  return { total, byType };
}
