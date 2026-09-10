import { canAffordMatchingJoinCreate } from '@jjoin/domain';

/**
 * Store matching create affordability.
 * Required 0 (reward 0 + fee 0) must be creatable even when available is 0 or omitted.
 */
export function canSubmitStoreMatchingJoinCreate(input: {
  walletAvailable?: string | null;
  totalRequiredCoin: string;
}): boolean {
  return canAffordMatchingJoinCreate(input.walletAvailable ?? '0', input.totalRequiredCoin);
}
