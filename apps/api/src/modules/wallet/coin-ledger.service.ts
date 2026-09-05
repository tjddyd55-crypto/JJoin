import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import {
  addCoinAmounts,
  compareCoinAmounts,
  isCoinAmountPositive,
  remainingMatchingHoldRefund,
  subCoinAmounts,
  zeroCoinAmount,
} from '@jjoin/domain';
import type { CoinIssuanceType } from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';
import {
  isDevCoinFundingAllowed,
  resolveFundingTargetForPersona,
} from '../../coin/dev-coin-policy';

export type PrismaTx = Prisma.TransactionClient;

export class InsufficientBalanceError extends Error {
  readonly code = 'INSUFFICIENT_BALANCE';
  constructor() {
    super('INSUFFICIENT_BALANCE');
    this.name = 'InsufficientBalanceError';
  }
}

export type IssueCoinsParams = {
  userId: string;
  amount: string;
  issuanceType: CoinIssuanceType | `${CoinIssuanceType}`;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdByUserId?: string | null;
  idempotencyKey: string;
  metadata?: Prisma.InputJsonValue;
  coinAssetId?: string;
};

/**
 * Immutable ledger writer + wallet projection updates.
 * Never expose update/delete for CoinTransaction rows.
 *
 * New Coin mints MUST go through issueCoins (COIN_ISSUANCE + CoinIssuance).
 * Transfer / Hold / Release / Refund never mint.
 */
@Injectable()
export class CoinLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateWallet(userId: string, coinAssetId?: string, tx?: PrismaTx) {
    const db = tx ?? this.prisma;
    const assetId =
      coinAssetId ??
      (await ensureFoundation(this.prisma)).coinAsset.id;

    const existing = await db.wallet.findUnique({
      where: { userId_coinAssetId: { userId, coinAssetId: assetId } },
    });
    if (existing) return existing;

    try {
      return await db.wallet.create({
        data: {
          userId,
          coinAssetId: assetId,
          availableBalance: new Prisma.Decimal(0),
          heldBalance: new Prisma.Decimal(0),
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return db.wallet.findUniqueOrThrow({
          where: { userId_coinAssetId: { userId, coinAssetId: assetId } },
        });
      }
      throw e;
    }
  }

  async lockWallet(tx: PrismaTx, walletId: string) {
    await tx.$queryRaw`
      SELECT id FROM wallets WHERE id = CAST(${walletId} AS uuid) FOR UPDATE
    `;
    return tx.wallet.findUniqueOrThrow({ where: { id: walletId } });
  }

  /**
   * Mint new Coin into a user wallet (supply ↑).
   * Creates CoinTransaction(COIN_ISSUANCE) + CoinIssuance atomically.
   * Idempotent on idempotencyKey — retries return the existing issuance.
   *
   * Architecture note: PURCHASE must call this only AFTER payment success (PG Phase).
   */
  async issueCoins(
    params: IssueCoinsParams,
    outerTx?: PrismaTx,
  ): Promise<{
    issuanceId: string;
    ledgerTxId: string;
    amount: string;
    alreadyExists: boolean;
  }> {
    if (!isCoinAmountPositive(params.amount)) {
      throw new Error('invalid_issuance_amount');
    }

    const run = async (tx: PrismaTx) => {
      const existingIssuance = await tx.coinIssuance.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existingIssuance) {
        return {
          issuanceId: existingIssuance.id,
          ledgerTxId: existingIssuance.ledgerTxId,
          amount: String(existingIssuance.amount),
          alreadyExists: true,
        };
      }

      const existingTx = await tx.coinTransaction.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
      });
      if (existingTx) {
        throw new ConflictException('issuance_ledger_key_conflict');
      }

      const { coinAsset } = await ensureFoundation(this.prisma);
      const assetId = params.coinAssetId ?? coinAsset.id;
      const wallet = await this.getOrCreateWallet(params.userId, assetId, tx);
      const locked = await this.lockWallet(tx, wallet.id);
      const available = String(locked.availableBalance);
      const held = String(locked.heldBalance);

      const ledgerTx = await this.appendCredit(tx, {
        walletId: locked.id,
        coinAssetId: assetId,
        type: 'COIN_ISSUANCE',
        amount: params.amount,
        availableBefore: available,
        heldBefore: held,
        idempotencyKey: params.idempotencyKey,
        refType: params.referenceType ?? undefined,
        refId: params.referenceId ?? undefined,
        metadata: {
          issuanceType: params.issuanceType,
          reason: params.reason ?? null,
          ...(params.metadata && typeof params.metadata === 'object' && !Array.isArray(params.metadata)
            ? (params.metadata as Record<string, unknown>)
            : {}),
        },
      });

      const issuance = await tx.coinIssuance.create({
        data: {
          userId: params.userId,
          coinAssetId: assetId,
          amount: new Prisma.Decimal(params.amount),
          issuanceType: params.issuanceType as never,
          reason: params.reason ?? null,
          referenceType: params.referenceType ?? null,
          referenceId: params.referenceId ?? null,
          createdByUserId: params.createdByUserId ?? null,
          ledgerTxId: ledgerTx.id,
          idempotencyKey: params.idempotencyKey,
          status: 'COMPLETED',
          metadata: params.metadata ?? undefined,
        },
      });

      return {
        issuanceId: issuance.id,
        ledgerTxId: ledgerTx.id,
        amount: params.amount,
        alreadyExists: false,
      };
    };

    if (outerTx) return run(outerTx);
    return this.prisma.$transaction((tx) => run(tx));
  }

  /**
   * Idempotent DEV/TEST top-up to funding target. Ledger-only — never raw balance UPDATE.
   * Guarded: mock auth + COIN_POLICY_MODE=dev only.
   * Counted as DEV_SEED issuance (supply ↑).
   */
  async ensureDevFundingTarget(userId: string, personaLabel: string): Promise<void> {
    if (!isDevCoinFundingAllowed()) {
      throw new Error('dev_coin_funding_forbidden');
    }
    const { coinAsset } = await ensureFoundation(this.prisma);
    const target = resolveFundingTargetForPersona(personaLabel);

    await this.prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(userId, coinAsset.id, tx);
      const locked = await this.lockWallet(tx, wallet.id);
      const available = String(locked.availableBalance);
      if (compareCoinAmounts(available, target) >= 0) {
        return;
      }
      const creditAmount = subCoinAmounts(target, available);
      // Include userId so KAKAO/NAVER/GOOGLE personas do not share funding ledger keys.
      let idempotencyKey = `dev-funding:${personaLabel}:${userId}:${coinAsset.code}:to-${target}:from-${available}`;
      const existing = await tx.coinIssuance.findUnique({ where: { idempotencyKey } });
      if (existing) {
        // Same available balance can recur after spend — allow another TEST top-up.
        idempotencyKey = `dev-funding:${personaLabel}:${userId}:${coinAsset.code}:${randomUUID()}`;
      }

      try {
        await this.issueCoins(
          {
            userId,
            amount: creditAmount,
            issuanceType: 'DEV_SEED',
            reason: `DEV funding to ${target}`,
            referenceType: 'DEV_FUNDING',
            referenceId: userId,
            idempotencyKey,
            metadata: { policy: 'TEST_ONLY', persona: personaLabel },
            coinAssetId: coinAsset.id,
          },
          tx,
        );
      } catch (err) {
        // Orphan CoinTransaction without CoinIssuance for a prior key — skip top-up; sign-in proceeds.
        if (err instanceof ConflictException) {
          return;
        }
        throw err;
      }
    });
  }

  async applyRoomCreationFee(
    tx: PrismaTx,
    params: {
      walletId: string;
      coinAssetId: string;
      amount: string;
      joinId: string;
      idempotencyKey: string;
    },
  ) {
    if (!isCoinAmountPositive(params.amount)) {
      // Zero fee allowed for POLICY_TBD edge — no ledger row.
      return null;
    }
    const existing = await tx.coinTransaction.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;

    const wallet = await this.lockWallet(tx, params.walletId);
    const available = String(wallet.availableBalance);
    const held = String(wallet.heldBalance);
    if (compareCoinAmounts(available, params.amount) < 0) {
      throw new InsufficientBalanceError();
    }
    return this.appendDebit(tx, {
      walletId: wallet.id,
      coinAssetId: params.coinAssetId,
      type: 'ROOM_CREATION_FEE',
      amount: params.amount,
      availableBefore: available,
      heldBefore: held,
      moveToHeld: false,
      idempotencyKey: params.idempotencyKey,
      refType: 'JOIN',
      refId: params.joinId,
    });
  }

  async applyJoinRewardHold(
    tx: PrismaTx,
    params: {
      walletId: string;
      coinAssetId: string;
      amount: string;
      joinId: string;
      idempotencyKey: string;
    },
  ) {
    if (!isCoinAmountPositive(params.amount)) {
      return { hold: null, tx: null };
    }

    const existingTx = await tx.coinTransaction.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existingTx) {
      const hold = await tx.coinHold.findFirst({
        where: { joinId: params.joinId, status: 'OPEN' },
      });
      return { hold, tx: existingTx };
    }

    const openHold = await tx.coinHold.findFirst({
      where: { joinId: params.joinId, status: 'OPEN' },
    });
    if (openHold) {
      throw new ConflictException('duplicate_join_reward_hold');
    }

    const wallet = await this.lockWallet(tx, params.walletId);
    const available = String(wallet.availableBalance);
    const held = String(wallet.heldBalance);
    if (compareCoinAmounts(available, params.amount) < 0) {
      throw new InsufficientBalanceError();
    }

    const hold = await tx.coinHold.create({
      data: {
        walletId: wallet.id,
        coinAssetId: params.coinAssetId,
        joinId: params.joinId,
        amount: new Prisma.Decimal(params.amount),
        reason: 'JOIN_REWARD_HOLD',
        status: 'OPEN',
      },
    });

    const ledgerTx = await this.appendDebit(tx, {
      walletId: wallet.id,
      coinAssetId: params.coinAssetId,
      type: 'JOIN_REWARD_HOLD',
      amount: params.amount,
      availableBefore: available,
      heldBefore: held,
      moveToHeld: true,
      idempotencyKey: params.idempotencyKey,
      refType: 'JOIN',
      refId: params.joinId,
      metadata: { holdId: hold.id },
    });

    return { hold, tx: ledgerTx };
  }

  /**
   * Release held reward to participant wallet.
   * Accounting (no double count):
   * - Host: JOIN_REWARD_RELEASE (held ↓ only)
   * - Participant: JOIN_REWARD_TRANSFER CREDIT (available ↑)
   * Shared economic idempotency prefix — manual/auto share same transfer key.
   */
  async applyRewardTransfer(
    tx: PrismaTx,
    params: {
      hostWalletId: string;
      participantWalletId: string;
      participantUserId: string;
      coinAssetId: string;
      amount: string;
      settlementId: string;
      joinId: string;
      idempotencyKey: string;
    },
  ) {
    const creditKey = `${params.idempotencyKey}:participant-credit`;
    const existingCredit = await tx.coinTransaction.findUnique({
      where: { idempotencyKey: creditKey },
    });
    if (existingCredit) {
      const release = await tx.coinTransaction.findUnique({
        where: { idempotencyKey: `${params.idempotencyKey}:host-release` },
      });
      return { participantTx: existingCredit, hostReleaseTx: release };
    }

    if (!isCoinAmountPositive(params.amount)) {
      throw new Error('invalid_transfer_amount');
    }

    const hostWallet = await this.lockWallet(tx, params.hostWalletId);
    const participantWallet = await this.lockWallet(tx, params.participantWalletId);

    const hostHeld = String(hostWallet.heldBalance);
    const hostAvailable = String(hostWallet.availableBalance);
    if (compareCoinAmounts(hostHeld, params.amount) < 0) {
      throw new InsufficientBalanceError();
    }

    const hostHeldAfter = subCoinAmounts(hostHeld, params.amount);
    await tx.wallet.update({
      where: { id: hostWallet.id },
      data: {
        availableBalance: new Prisma.Decimal(hostAvailable),
        heldBalance: new Prisma.Decimal(hostHeldAfter),
      },
    });

    const hostReleaseTx = await tx.coinTransaction.create({
      data: {
        walletId: hostWallet.id,
        coinAssetId: params.coinAssetId,
        type: 'JOIN_REWARD_RELEASE',
        direction: 'DEBIT',
        amount: new Prisma.Decimal(params.amount),
        balanceAfterAvailable: new Prisma.Decimal(hostAvailable),
        balanceAfterHeld: new Prisma.Decimal(hostHeldAfter),
        refType: 'SETTLEMENT',
        refId: params.settlementId,
        idempotencyKey: `${params.idempotencyKey}:host-release`,
        metadata: {
          joinId: params.joinId,
          participantUserId: params.participantUserId,
        },
      },
    });

    const partAvailable = String(participantWallet.availableBalance);
    const partHeld = String(participantWallet.heldBalance);
    const partAvailableAfter = addCoinAmounts(partAvailable, params.amount);

    await tx.wallet.update({
      where: { id: participantWallet.id },
      data: {
        availableBalance: new Prisma.Decimal(partAvailableAfter),
        heldBalance: new Prisma.Decimal(partHeld),
      },
    });

    const participantTx = await tx.coinTransaction.create({
      data: {
        walletId: participantWallet.id,
        coinAssetId: params.coinAssetId,
        type: 'JOIN_REWARD_TRANSFER',
        direction: 'CREDIT',
        amount: new Prisma.Decimal(params.amount),
        balanceAfterAvailable: new Prisma.Decimal(partAvailableAfter),
        balanceAfterHeld: new Prisma.Decimal(partHeld),
        refType: 'SETTLEMENT',
        refId: params.settlementId,
        idempotencyKey: creditKey,
        metadata: {
          joinId: params.joinId,
          fromHostWalletId: hostWallet.id,
        },
      },
    });

    return { participantTx, hostReleaseTx };
  }

  /** Refund held reward slice back to host available (NO_SHOW etc.). */
  async applyRewardRefund(
    tx: PrismaTx,
    params: {
      hostWalletId: string;
      coinAssetId: string;
      amount: string;
      settlementId: string;
      joinId: string;
      idempotencyKey: string;
    },
  ) {
    const existing = await tx.coinTransaction.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;

    if (!isCoinAmountPositive(params.amount)) {
      throw new Error('invalid_refund_amount');
    }

    const wallet = await this.lockWallet(tx, params.hostWalletId);
    const available = String(wallet.availableBalance);
    const held = String(wallet.heldBalance);
    if (compareCoinAmounts(held, params.amount) < 0) {
      throw new InsufficientBalanceError();
    }

    const availableAfter = addCoinAmounts(available, params.amount);
    const heldAfter = subCoinAmounts(held, params.amount);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: new Prisma.Decimal(availableAfter),
        heldBalance: new Prisma.Decimal(heldAfter),
      },
    });

    return tx.coinTransaction.create({
      data: {
        walletId: wallet.id,
        coinAssetId: params.coinAssetId,
        type: 'JOIN_REWARD_REFUND',
        direction: 'CREDIT',
        amount: new Prisma.Decimal(params.amount),
        balanceAfterAvailable: new Prisma.Decimal(availableAfter),
        balanceAfterHeld: new Prisma.Decimal(heldAfter),
        refType: 'SETTLEMENT',
        refId: params.settlementId,
        idempotencyKey: params.idempotencyKey,
        metadata: { joinId: params.joinId },
      },
    });
  }

  /** Refund remaining open hold after settlements — idempotent. */
  async refundRemainingJoinHold(
    tx: PrismaTx,
    params: {
      hostWalletId: string;
      coinAssetId: string;
      joinId: string;
      idempotencyKey: string;
    },
  ) {
    const existing = await tx.coinTransaction.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;

    const hold = await tx.coinHold.findFirst({
      where: {
        joinId: params.joinId,
        status: { in: ['OPEN', 'PARTIALLY_RELEASED'] },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!hold) return null;

    const settlements = await tx.rewardSettlement.findMany({
      where: { joinId: params.joinId },
    });

    const holdTotal = String(hold.amount);
    const remaining = remainingMatchingHoldRefund({
      holdTotal,
      settlements: settlements.map((s) => ({
        amount: String(s.amount),
        rewardStatus: s.rewardStatus,
      })),
    });

    if (compareCoinAmounts(remaining, '0') <= 0) {
      await tx.coinHold.update({
        where: { id: hold.id },
        data: { status: 'REFUNDED', refundedAt: new Date(), releasedAt: new Date() },
      });
      return null;
    }

    const wallet = await this.lockWallet(tx, params.hostWalletId);
    const available = String(wallet.availableBalance);
    const held = String(wallet.heldBalance);
    if (compareCoinAmounts(held, remaining) < 0) {
      throw new InsufficientBalanceError();
    }

    const availableAfter = addCoinAmounts(available, remaining);
    const heldAfter = subCoinAmounts(held, remaining);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: new Prisma.Decimal(availableAfter),
        heldBalance: new Prisma.Decimal(heldAfter),
      },
    });

    const ledgerTx = await tx.coinTransaction.create({
      data: {
        walletId: wallet.id,
        coinAssetId: params.coinAssetId,
        type: 'JOIN_REWARD_REFUND',
        direction: 'CREDIT',
        amount: new Prisma.Decimal(remaining),
        balanceAfterAvailable: new Prisma.Decimal(availableAfter),
        balanceAfterHeld: new Prisma.Decimal(heldAfter),
        refType: 'JOIN',
        refId: params.joinId,
        idempotencyKey: params.idempotencyKey,
        metadata: { holdId: hold.id, reason: 'REMAINING_HOLD_REFUND' },
      },
    });

    await tx.coinHold.update({
      where: { id: hold.id },
      data: { status: 'REFUNDED', refundedAt: new Date(), releasedAt: new Date() },
    });

    return ledgerTx;
  }

  async refreshCoinHoldStatus(tx: PrismaTx, holdId: string) {
    const hold = await tx.coinHold.findUniqueOrThrow({ where: { id: holdId } });
    const settlements = await tx.rewardSettlement.findMany({ where: { holdId } });
    const holdTotal = String(hold.amount);

    let accounted = zeroCoinAmount();
    for (const s of settlements) {
      if (['PAID', 'AUTO_PAID', 'REFUNDED'].includes(s.rewardStatus)) {
        accounted = addCoinAmounts(accounted, String(s.amount));
      }
    }

    let status: 'OPEN' | 'PARTIALLY_RELEASED' | 'RELEASED' | 'REFUNDED' = hold.status as never;
    if (compareCoinAmounts(accounted, '0') === 0) {
      status = 'OPEN';
    } else if (compareCoinAmounts(accounted, holdTotal) < 0) {
      status = 'PARTIALLY_RELEASED';
    } else {
      const allRefunded = settlements.every((s) => s.rewardStatus === 'REFUNDED');
      status = allRefunded ? 'REFUNDED' : 'RELEASED';
    }

    await tx.coinHold.update({
      where: { id: holdId },
      data: {
        status,
        ...(status === 'RELEASED' || status === 'REFUNDED' ? { releasedAt: new Date() } : {}),
      },
    });
  }

  /** Reconcile wallet projection against ledger + open holds. */
  async reconcileWallet(walletId: string): Promise<{
    ok: boolean;
    availableProjected: string;
    heldProjected: string;
    availableLedger: string;
    heldLedger: string;
  }> {
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    const txs = await this.prisma.coinTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'asc' },
    });

    let available = zeroCoinAmount();
    let held = zeroCoinAmount();

    for (const row of txs) {
      const amount = String(row.amount);
      if (
        (row.type === 'ADMIN_ADJUSTMENT' || row.type === 'COIN_ISSUANCE') &&
        row.direction === 'CREDIT'
      ) {
        available = addCoinAmounts(available, amount);
        continue;
      }
      if (row.type === 'ROOM_CREATION_FEE' && row.direction === 'DEBIT') {
        available = subCoinAmounts(available, amount);
        continue;
      }
      if (row.type === 'JOIN_REWARD_HOLD' && row.direction === 'DEBIT') {
        available = subCoinAmounts(available, amount);
        held = addCoinAmounts(held, amount);
        continue;
      }
      if (row.type === 'JOIN_REWARD_RELEASE' && row.direction === 'DEBIT') {
        held = subCoinAmounts(held, amount);
        continue;
      }
      if (row.type === 'JOIN_REWARD_TRANSFER' && row.direction === 'CREDIT') {
        available = addCoinAmounts(available, amount);
        continue;
      }
      if (row.type === 'JOIN_REWARD_REFUND' && row.direction === 'CREDIT') {
        available = addCoinAmounts(available, amount);
        held = subCoinAmounts(held, amount);
        continue;
      }
    }

    const availableProjected = String(wallet.availableBalance);
    const heldProjected = String(wallet.heldBalance);
    const ok =
      compareCoinAmounts(availableProjected, available) === 0 &&
      compareCoinAmounts(heldProjected, held) === 0;

    return {
      ok,
      availableProjected,
      heldProjected,
      availableLedger: available,
      heldLedger: held,
    };
  }

  private async appendCredit(
    tx: PrismaTx,
    params: {
      walletId: string;
      coinAssetId: string;
      type: 'ADMIN_ADJUSTMENT' | 'COIN_ISSUANCE';
      amount: string;
      availableBefore: string;
      heldBefore: string;
      idempotencyKey: string;
      refType?: string;
      refId?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    const availableAfter = addCoinAmounts(params.availableBefore, params.amount);
    const heldAfter = params.heldBefore;

    await tx.wallet.update({
      where: { id: params.walletId },
      data: {
        availableBalance: new Prisma.Decimal(availableAfter),
        heldBalance: new Prisma.Decimal(heldAfter),
      },
    });

    return tx.coinTransaction.create({
      data: {
        walletId: params.walletId,
        coinAssetId: params.coinAssetId,
        type: params.type,
        direction: 'CREDIT',
        amount: new Prisma.Decimal(params.amount),
        balanceAfterAvailable: new Prisma.Decimal(availableAfter),
        balanceAfterHeld: new Prisma.Decimal(heldAfter),
        refType: params.refType,
        refId: params.refId,
        idempotencyKey: params.idempotencyKey,
        metadata: params.metadata,
      },
    });
  }

  private async appendDebit(
    tx: PrismaTx,
    params: {
      walletId: string;
      coinAssetId: string;
      type: 'ROOM_CREATION_FEE' | 'JOIN_REWARD_HOLD';
      amount: string;
      availableBefore: string;
      heldBefore: string;
      moveToHeld: boolean;
      idempotencyKey: string;
      refType?: string;
      refId?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    const availableAfter = subCoinAmounts(params.availableBefore, params.amount);
    const heldAfter = params.moveToHeld
      ? addCoinAmounts(params.heldBefore, params.amount)
      : params.heldBefore;

    if (compareCoinAmounts(availableAfter, '0') < 0) {
      throw new InsufficientBalanceError();
    }

    await tx.wallet.update({
      where: { id: params.walletId },
      data: {
        availableBalance: new Prisma.Decimal(availableAfter),
        heldBalance: new Prisma.Decimal(heldAfter),
      },
    });

    return tx.coinTransaction.create({
      data: {
        walletId: params.walletId,
        coinAssetId: params.coinAssetId,
        type: params.type,
        direction: 'DEBIT',
        amount: new Prisma.Decimal(params.amount),
        balanceAfterAvailable: new Prisma.Decimal(availableAfter),
        balanceAfterHeld: new Prisma.Decimal(heldAfter),
        refType: params.refType,
        refId: params.refId,
        idempotencyKey: params.idempotencyKey,
        metadata: params.metadata,
      },
    });
  }
}
