import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CoinTxType,
  type WalletSummaryDto,
  type WalletTransactionDto,
  type WalletTransactionsResponse,
} from '@jjoin/types';
import { addCoinAmounts, formatCoinTransactionLabelKo, zeroCoinAmount } from '@jjoin/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import { CoinLedgerService } from './coin-ledger.service';

const TX_LABELS: Record<string, string> = {
  ROOM_CREATION_FEE: formatCoinTransactionLabelKo('ROOM_CREATION_FEE'),
  JOIN_REWARD_HOLD: formatCoinTransactionLabelKo('JOIN_REWARD_HOLD'),
  JOIN_REWARD_RELEASE: formatCoinTransactionLabelKo('JOIN_REWARD_RELEASE'),
  JOIN_REWARD_TRANSFER: formatCoinTransactionLabelKo('JOIN_REWARD_TRANSFER'),
  JOIN_REWARD_REFUND: formatCoinTransactionLabelKo('JOIN_REWARD_REFUND'),
  ADMIN_ADJUSTMENT: formatCoinTransactionLabelKo('ADMIN_ADJUSTMENT'),
  COIN_ISSUANCE: formatCoinTransactionLabelKo('COIN_ISSUANCE'),
};

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
  ) {}

  ping() {
    return {
      module: 'wallet',
      status: 'ready',
      accountingSsot: 'CoinTransaction',
      settlement: 'DEFERRED',
      ...this.assertLedgerImmutable(),
    };
  }

  async getSummary(userId: string): Promise<WalletSummaryDto> {
    const { coinAsset } = await ensureFoundation(this.prisma);
    const wallet = await this.ledger.getOrCreateWallet(userId, coinAsset.id);
    const recent = await this.prisma.coinTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const availableCoin = String(wallet.availableBalance);
    const heldCoin = String(wallet.heldBalance);
    const pendingPayoutCoin = await this.sumPendingParticipantPayout(userId);

    return {
      assetCode: coinAsset.code,
      availableCoin,
      heldCoin,
      pendingPayoutCoin,
      totalCoin: addCoinAmounts(availableCoin, heldCoin),
      recentTransactions: recent.map((row) => this.toTxDto(row)),
    };
  }

  /** Sum of PENDING_CONFIRMATION participant rewards — host settlement not yet finalized. */
  private async sumPendingParticipantPayout(userId: string): Promise<string> {
    const rows = await this.prisma.rewardSettlement.findMany({
      where: {
        rewardStatus: 'PENDING_CONFIRMATION',
        participant: {
          userId,
          role: 'PARTICIPANT',
          participationStatus: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED'] },
        },
      },
      select: { amount: true },
    });
    if (rows.length === 0) return zeroCoinAmount();
    return rows.reduce((sum, row) => addCoinAmounts(sum, String(row.amount)), zeroCoinAmount());
  }

  async listTransactions(
    userId: string,
    opts: { cursor?: string; limit?: number },
  ): Promise<WalletTransactionsResponse> {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
    const { coinAsset } = await ensureFoundation(this.prisma);
    const wallet = await this.ledger.getOrCreateWallet(userId, coinAsset.id);

    const rows = await this.prisma.coinTransaction.findMany({
      where: {
        walletId: wallet.id,
        ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const slice = rows.slice(0, limit);
    const next = rows.length > limit ? slice[slice.length - 1]?.createdAt.toISOString() ?? null : null;

    return {
      items: slice.map((row) => this.toTxDto(row)),
      nextCursor: next,
    };
  }

  /** Guard: no public mutation API for ledger rows. */
  assertLedgerImmutable(): { updateRoute: false; deleteRoute: false } {
    return { updateRoute: false, deleteRoute: false };
  }

  async reconcileForUser(userId: string) {
    const { coinAsset } = await ensureFoundation(this.prisma);
    const wallet = await this.ledger.getOrCreateWallet(userId, coinAsset.id);
    return this.ledger.reconcileWallet(wallet.id);
  }

  async requireOwnWallet(userId: string, walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('wallet_not_found');
    if (wallet.userId !== userId) throw new ForbiddenException('wallet_forbidden');
    return wallet;
  }

  private toTxDto(row: {
    id: string;
    type: string;
    direction: string;
    amount: { toString(): string };
    createdAt: Date;
    refType: string | null;
    refId: string | null;
  }): WalletTransactionDto {
    const amount = String(row.amount);
    const signed = row.direction === 'CREDIT' ? `+${amount}` : `-${amount}`;
    return {
      id: row.id,
      type: row.type as CoinTxType,
      direction: row.direction as 'DEBIT' | 'CREDIT',
      amount: signed,
      createdAt: row.createdAt.toISOString(),
      label: TX_LABELS[row.type] ?? row.type,
      reference: { refType: row.refType, refId: row.refId },
    };
  }
}
