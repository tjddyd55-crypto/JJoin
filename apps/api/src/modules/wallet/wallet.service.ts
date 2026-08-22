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
import { addCoinAmounts } from '@jjoin/domain';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import { CoinLedgerService } from './coin-ledger.service';

const TX_LABELS: Record<string, string> = {
  ROOM_CREATION_FEE: '방 생성 수수료',
  JOIN_REWARD_HOLD: '참가 보상 보류',
  JOIN_REWARD_RELEASE: '참가 보상 보류 해제',
  JOIN_REWARD_TRANSFER: '참가 보상 지급',
  JOIN_REWARD_REFUND: '참가 보상 환불',
  ADMIN_ADJUSTMENT: '테스트 코인 조정',
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

    return {
      assetCode: coinAsset.code,
      availableCoin,
      heldCoin,
      totalCoin: addCoinAmounts(availableCoin, heldCoin),
      recentTransactions: recent.map((row) => this.toTxDto(row)),
    };
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
