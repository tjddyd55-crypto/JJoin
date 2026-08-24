import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  currentSupply,
  isCoinAmountPositive,
  verifySupplyIdentity,
} from '@jjoin/domain';
import {
  CoinIssuanceStatus,
  CoinIssuanceType,
  type AdminManualIssuanceRequest,
  type AdminManualIssuanceResponse,
  type AdminUserCoinHistoryDto,
  type CoinIssuanceBreakdownItemDto,
  type CoinIssuanceDetailDto,
  type CoinIssuanceListItemDto,
  type CoinIssuanceListResponse,
  type CoinSupplyDashboardDto,
  type CoinSupplyKpiDto,
  type CoinSupplyReconciliationDto,
  type WalletTransactionDto,
} from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import { CoinLedgerService } from '../wallet/coin-ledger.service';

const MANUAL_GRANT_TYPES = new Set<string>([
  CoinIssuanceType.ADMIN_GRANT,
  CoinIssuanceType.CUSTOMER_SUPPORT,
  CoinIssuanceType.OTHER,
  CoinIssuanceType.PROMOTION,
  CoinIssuanceType.EVENT_REWARD,
]);

const TX_LABELS: Record<string, string> = {
  ROOM_CREATION_FEE: '방 생성 수수료',
  JOIN_REWARD_HOLD: '참가 보상 보류',
  JOIN_REWARD_RELEASE: '참가 보상 보류 해제',
  JOIN_REWARD_TRANSFER: '참가 보상 지급',
  JOIN_REWARD_REFUND: '참가 보상 환불',
  ADMIN_ADJUSTMENT: '테스트 코인 조정',
  COIN_ISSUANCE: 'Coin 발행',
};

type DateRange = { from?: Date; to?: Date };

@Injectable()
export class AdminCoinSupplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
  ) {}

  async getDashboard(options: {
    excludeDevSeed?: boolean;
  }): Promise<CoinSupplyDashboardDto> {
    const excludeDevSeed = options.excludeDevSeed === true;
    const kpi = await this.buildKpi(excludeDevSeed);
    const breakdown = await this.buildBreakdown(excludeDevSeed);
    return { kpi, breakdown };
  }

  async reconcile(options: {
    excludeDevSeed?: boolean;
  }): Promise<CoinSupplyReconciliationDto> {
    // Identity always uses full issuance books (DEV_SEED included).
    void options.excludeDevSeed;
    const totals = await this.loadSupplyTotals(false);
    const identity = verifySupplyIdentity(totals);
    return {
      ok: identity.ok,
      totalIssued: totals.totalIssued,
      totalBurned: totals.totalBurned,
      currentSupplyFromBooks: identity.currentSupplyFromBooks,
      totalAvailable: totals.totalAvailable,
      totalHeld: totals.totalHeld,
      currentSupplyFromWallets: identity.currentSupplyFromWallets,
      delta: identity.delta,
      excludeDevSeed: false,
      autoFixAllowed: false,
    };
  }

  async listIssuances(query: {
    issuanceType?: CoinIssuanceType | string;
    from?: string;
    to?: string;
    userId?: string;
    excludeDevSeed?: boolean;
    cursor?: string;
    limit?: number;
  }): Promise<CoinIssuanceListResponse> {
    const take = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const range = this.parseRange(query.from, query.to);
    const where: Prisma.CoinIssuanceWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.issuanceType
        ? { issuanceType: query.issuanceType as CoinIssuanceType }
        : {}),
      ...(query.excludeDevSeed ? { issuanceType: { not: CoinIssuanceType.DEV_SEED } } : {}),
      ...(range.from || range.to
        ? {
            createdAt: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {}),
            },
          }
        : {}),
    };

    // issuanceType + excludeDevSeed conflict: prefer explicit type filter
    if (query.issuanceType && query.excludeDevSeed) {
      where.issuanceType = query.issuanceType as CoinIssuanceType;
    }

    const rows = await this.prisma.coinIssuance.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      include: {
        user: { include: { profile: true } },
        createdBy: { include: { profile: true } },
      },
    });

    const page = rows.slice(0, take);
    const items = page.map((row) => this.toListItem(row));
    const nextCursor = rows.length > take ? page[page.length - 1]?.id ?? null : null;
    return { items, nextCursor };
  }

  async getIssuance(issuanceId: string): Promise<CoinIssuanceDetailDto> {
    const row = await this.prisma.coinIssuance.findUnique({
      where: { id: issuanceId },
      include: {
        user: { include: { profile: true } },
        createdBy: { include: { profile: true } },
      },
    });
    if (!row) throw new NotFoundException('issuance_not_found');
    return {
      ...this.toListItem(row),
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null,
    };
  }

  async manualIssue(
    adminUserId: string,
    body: AdminManualIssuanceRequest,
  ): Promise<AdminManualIssuanceResponse> {
    if (!body.userId?.trim()) throw new BadRequestException('userId_required');
    if (!body.idempotencyKey?.trim()) throw new BadRequestException('idempotencyKey_required');
    if (!body.reason?.trim()) throw new BadRequestException('reason_required');
    if (!isCoinAmountPositive(body.amount)) throw new BadRequestException('invalid_amount');
    if (!MANUAL_GRANT_TYPES.has(body.issuanceType)) {
      throw new BadRequestException('issuanceType_not_allowed_for_manual_grant');
    }

    const user = await this.prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) throw new NotFoundException('user_not_found');

    const result = await this.ledger.issueCoins({
      userId: body.userId,
      amount: body.amount,
      issuanceType: body.issuanceType,
      reason: body.reason.trim(),
      referenceType: body.referenceType ?? 'ADMIN_MANUAL',
      referenceId: body.referenceId ?? body.idempotencyKey,
      createdByUserId: adminUserId,
      idempotencyKey: body.idempotencyKey.trim(),
      metadata: { channel: 'admin_manual' },
    });

    return {
      issuanceId: result.issuanceId,
      ledgerTxId: result.ledgerTxId,
      amount: result.amount,
      alreadyExists: result.alreadyExists,
    };
  }

  async getUserCoinHistory(userId: string): Promise<AdminUserCoinHistoryDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('user_not_found');

    const { coinAsset } = await ensureFoundation(this.prisma);
    const wallet = await this.ledger.getOrCreateWallet(userId, coinAsset.id);

    const [issuedAgg, transferAgg, burnAgg, recent] = await Promise.all([
      this.prisma.coinIssuance.aggregate({
        where: { userId, status: CoinIssuanceStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.coinTransaction.aggregate({
        where: { walletId: wallet.id, type: 'JOIN_REWARD_TRANSFER', direction: 'CREDIT' },
        _sum: { amount: true },
      }),
      this.prisma.coinTransaction.aggregate({
        where: { walletId: wallet.id, type: 'ROOM_CREATION_FEE', direction: 'DEBIT' },
        _sum: { amount: true },
      }),
      this.prisma.coinTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    return {
      userId,
      nickname: user.profile?.nickname ?? null,
      availableCoin: String(wallet.availableBalance),
      heldCoin: String(wallet.heldBalance),
      lifetimeIssuedReceived: String(issuedAgg._sum.amount ?? 0),
      lifetimeTransferReceived: String(transferAgg._sum.amount ?? 0),
      lifetimeBurnContributed: String(burnAgg._sum.amount ?? 0),
      recentTransactions: recent.map((row) => this.toTxDto(row)),
    };
  }

  private async buildKpi(excludeDevSeed: boolean): Promise<CoinSupplyKpiDto> {
    const full = await this.loadSupplyTotals(false);
    const identity = verifySupplyIdentity(full);
    const productionIssued = await this.sumIssuances({}, true);
    const now = new Date();
    const startOfToday = startOfDaySeoul(now);
    const startOfMonth = startOfMonthSeoul(now);

    const [todayIssued, monthIssued] = await Promise.all([
      this.sumIssuances({ from: startOfToday }, excludeDevSeed),
      this.sumIssuances({ from: startOfMonth }, excludeDevSeed),
    ]);

    return {
      totalIssued: full.totalIssued,
      productionIssued,
      currentSupply: currentSupply(full.totalIssued, full.totalBurned),
      totalAvailable: full.totalAvailable,
      totalHeld: full.totalHeld,
      totalBurned: full.totalBurned,
      todayIssued,
      monthIssued,
      excludeDevSeed,
      identityOk: identity.ok,
      identityDelta: identity.delta,
    };
  }

  private async buildBreakdown(excludeDevSeed: boolean): Promise<CoinIssuanceBreakdownItemDto[]> {
    const grouped = await this.prisma.coinIssuance.groupBy({
      by: ['issuanceType'],
      where: {
        status: CoinIssuanceStatus.COMPLETED,
        ...(excludeDevSeed ? { issuanceType: { not: CoinIssuanceType.DEV_SEED } } : {}),
      },
      _sum: { amount: true },
    });

    return grouped
      .map((g) => ({
        issuanceType: g.issuanceType as CoinIssuanceType,
        amount: String(g._sum.amount ?? 0),
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount));
  }

  private async loadSupplyTotals(excludeDevSeed: boolean) {
    const [issued, burned, wallets] = await Promise.all([
      this.sumIssuances({}, excludeDevSeed),
      this.sumBurns(),
      this.prisma.wallet.aggregate({
        _sum: { availableBalance: true, heldBalance: true },
      }),
    ]);

    return {
      totalIssued: issued,
      totalBurned: burned,
      totalAvailable: String(wallets._sum.availableBalance ?? 0),
      totalHeld: String(wallets._sum.heldBalance ?? 0),
    };
  }

  private async sumIssuances(range: DateRange, excludeDevSeed: boolean): Promise<string> {
    const agg = await this.prisma.coinIssuance.aggregate({
      where: {
        status: CoinIssuanceStatus.COMPLETED,
        ...(excludeDevSeed ? { issuanceType: { not: CoinIssuanceType.DEV_SEED } } : {}),
        ...(range.from || range.to
          ? {
              createdAt: {
                ...(range.from ? { gte: range.from } : {}),
                ...(range.to ? { lte: range.to } : {}),
              },
            }
          : {}),
      },
      _sum: { amount: true },
    });
    return String(agg._sum.amount ?? 0);
  }

  private async sumBurns(): Promise<string> {
    const agg = await this.prisma.coinTransaction.aggregate({
      where: { type: 'ROOM_CREATION_FEE', direction: 'DEBIT' },
      _sum: { amount: true },
    });
    return String(agg._sum.amount ?? 0);
  }

  private parseRange(from?: string, to?: string): DateRange {
    const out: DateRange = {};
    if (from) {
      const d = new Date(from);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('invalid_from');
      out.from = d;
    }
    if (to) {
      const d = new Date(to);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('invalid_to');
      out.to = d;
    }
    return out;
  }

  private toListItem(row: {
    id: string;
    createdAt: Date;
    userId: string;
    amount: Prisma.Decimal;
    issuanceType: string;
    reason: string | null;
    referenceType: string | null;
    referenceId: string | null;
    createdByUserId: string | null;
    status: string;
    ledgerTxId: string;
    user?: { profile?: { nickname: string } | null } | null;
    createdBy?: { profile?: { nickname: string } | null } | null;
  }): CoinIssuanceListItemDto {
    return {
      issuanceId: row.id,
      createdAt: row.createdAt.toISOString(),
      userId: row.userId,
      userNickname: row.user?.profile?.nickname ?? null,
      amount: String(row.amount),
      issuanceType: row.issuanceType as CoinIssuanceType,
      reason: row.reason,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      createdByUserId: row.createdByUserId,
      createdByLabel: row.createdByUserId
        ? (row.createdBy?.profile?.nickname ?? 'ADMIN')
        : 'SYSTEM',
      status: row.status as CoinIssuanceStatus,
      ledgerTxId: row.ledgerTxId,
    };
  }

  private toTxDto(row: {
    id: string;
    type: string;
    direction: string;
    amount: Prisma.Decimal;
    createdAt: Date;
    refType: string | null;
    refId: string | null;
  }): WalletTransactionDto {
    return {
      id: row.id,
      type: row.type as never,
      direction: row.direction as 'DEBIT' | 'CREDIT',
      amount: row.direction === 'CREDIT' ? `+${String(row.amount)}` : `-${String(row.amount)}`,
      createdAt: row.createdAt.toISOString(),
      label: TX_LABELS[row.type] ?? row.type,
      reference: { refType: row.refType, refId: row.refId },
    };
  }
}

/** Approximate Asia/Seoul day boundary without extra deps. */
function startOfDaySeoul(now: Date): Date {
  const utc = now.getTime() + 9 * 60 * 60_000;
  const seoul = new Date(utc);
  const y = seoul.getUTCFullYear();
  const m = seoul.getUTCMonth();
  const d = seoul.getUTCDate();
  return new Date(Date.UTC(y, m, d) - 9 * 60 * 60_000);
}

function startOfMonthSeoul(now: Date): Date {
  const utc = now.getTime() + 9 * 60 * 60_000;
  const seoul = new Date(utc);
  const y = seoul.getUTCFullYear();
  const m = seoul.getUTCMonth();
  return new Date(Date.UTC(y, m, 1) - 9 * 60 * 60_000);
}
