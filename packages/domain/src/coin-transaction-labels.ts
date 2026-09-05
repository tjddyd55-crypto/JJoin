/**
 * Korean labels for CoinTransaction.type — UI SSOT.
 * Enum values live in @jjoin/types; do not duplicate types here.
 */

const COIN_TX_LABEL_KO: Record<string, string> = {
  ROOM_CREATION_FEE: '조인 생성 수수료',
  JOIN_REWARD_HOLD: '조인 생성 HOLD',
  JOIN_REWARD_RELEASE: 'HOLD 해제',
  JOIN_REWARD_TRANSFER: '조인 참가 보상',
  JOIN_REWARD_REFUND: '조인 종료 잔여 HOLD 반환',
  ADMIN_ADJUSTMENT: '관리자 조정',
  COIN_ISSUANCE: '코인 충전',
};

export function formatCoinTransactionLabelKo(type: string): string {
  return COIN_TX_LABEL_KO[type] ?? type;
}

/** Filter tabs for wallet history (compact MVP). */
export type WalletTransactionFilter = 'ALL' | 'CREDIT' | 'DEBIT' | 'HOLD';

export function matchesWalletTransactionFilter(
  filter: WalletTransactionFilter,
  row: { direction: string; type: string },
): boolean {
  if (filter === 'ALL') return true;
  if (filter === 'CREDIT') return row.direction === 'CREDIT';
  if (filter === 'DEBIT') return row.direction === 'DEBIT';
  return row.type === 'JOIN_REWARD_HOLD' || row.type === 'JOIN_REWARD_RELEASE';
}
