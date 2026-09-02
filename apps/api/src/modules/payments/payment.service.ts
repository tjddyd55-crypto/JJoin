import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  maskSecretKey,
} from '@jjoin/domain';
import {
  CoinIssuanceType,
  PaymentEnvironment,
  PaymentProviderKind,
  PaymentProductType,
  PaymentStatus,
  type AdminPaymentDetailDto,
  type AdminPaymentListItemDto,
  type AdminPaymentProviderSettingsDto,
  type CreatePaymentOrderResponse,
  type PaymentDetailDto,
  type PaymentListItemDto,
  type PaymentProductDto,
  type PublicPaymentConfigDto,
} from '@jjoin/types';
import {
  confirmTossPaymentSchema,
  createPaymentOrderSchema,
  updateAdminPaymentProviderSettingsSchema,
  updatePaymentProductSchema,
} from '@jjoin/validation';
import { Prisma } from '@prisma/client';
import {
  decryptCredential,
  encryptCredential,
  hasPaymentEncryptionKey,
} from '../../common/credential-crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CoinLedgerService } from '../wallet/coin-ledger.service';
import { PremiumService } from './premium.service';
import { TossPaymentError, TossPaymentProvider } from './toss-payment.provider';

const CHECKOUT_TOKEN_TTL_MS = 30 * 60 * 1000;
const CONFIRMABLE_STATUSES: PaymentStatus[] = [PaymentStatus.READY, PaymentStatus.PROCESSING];

function resolvePublicApiBase(): string {
  const base = (
    process.env.PUBLIC_API_BASE_URL ??
    process.env.API_PUBLIC_BASE_URL ??
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');
  return base;
}

function resolveMobilePaymentScheme(): string {
  return (process.env.PAYMENT_MOBILE_SCHEME ?? 'jjoindev').trim();
}

function isDevelopmentPaymentEnvironment(): boolean {
  if (process.env.PAYMENT_CHECKOUT_WEB_CALLBACK === '1') return true;
  const envName = (process.env.RAILWAY_ENVIRONMENT_NAME ?? '').toLowerCase();
  if (envName === 'development') return true;
  return resolvePublicApiBase().includes('development');
}

type CheckoutCallbackMode = 'app' | 'web' | 'webview';

function resolveCheckoutRedirectUrls(
  callbackMode: CheckoutCallbackMode = 'app',
): { successUrl: string; failUrl: string } {
  const scheme = resolveMobilePaymentScheme();
  const base = resolvePublicApiBase();
  if (callbackMode === 'web' && isDevelopmentPaymentEnvironment()) {
    return {
      successUrl: `${base}/payments/toss/web-callback?outcome=success`,
      failUrl: `${base}/payments/toss/web-callback?outcome=fail`,
    };
  }
  if (callbackMode === 'webview') {
    return {
      successUrl: `${base}/payments/toss/webview-return?outcome=success`,
      failUrl: `${base}/payments/toss/webview-return?outcome=fail`,
    };
  }
  return {
    successUrl: `${scheme}://payment/success`,
    failUrl: `${scheme}://payment/fail`,
  };
}

function generateOrderId(): string {
  return `JJ${randomBytes(12).toString('base64url')}`;
}

function mapProduct(row: {
  id: string;
  code: string;
  type: string;
  name: string;
  description: string | null;
  price: number;
  coinAmount: Prisma.Decimal | null;
  premiumDays: number | null;
  sortOrder: number;
  active: boolean;
}): PaymentProductDto {
  return {
    id: row.id,
    code: row.code,
    type: row.type as PaymentProductType,
    name: row.name,
    description: row.description,
    price: row.price,
    coinAmount: row.coinAmount != null ? String(row.coinAmount) : null,
    premiumDays: row.premiumDays,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CoinLedgerService,
    private readonly premium: PremiumService,
    private readonly toss: TossPaymentProvider,
  ) {}

  async listActiveProducts(type?: PaymentProductType): Promise<PaymentProductDto[]> {
    const rows = await this.prisma.paymentProduct.findMany({
      where: {
        active: true,
        ...(type ? { type } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(mapProduct);
  }

  async getPublicConfig(): Promise<PublicPaymentConfigDto> {
    const settings = await this.loadProviderSettings();
    return {
      provider: PaymentProviderKind.TOSS,
      environment: settings.environment as PaymentEnvironment,
      clientKey: settings.clientKey ?? '',
      enabled: settings.enabled && Boolean(settings.clientKey),
    };
  }

  async createOrder(userId: string, raw: unknown): Promise<CreatePaymentOrderResponse> {
    const parsed = createPaymentOrderSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_payment_order');
    const product = await this.prisma.paymentProduct.findUnique({
      where: { id: parsed.data.productId },
    });
    if (!product || !product.active) throw new NotFoundException('payment_product_not_found');

    const settings = await this.loadProviderSettings();
    if (!settings.enabled || !settings.clientKey) {
      throw new ServiceUnavailableException('payment_not_configured');
    }
    if (!settings.secretKeyEncrypted) {
      throw new ServiceUnavailableException('payment_secret_missing');
    }

    // Finalize abandoned READY rows before creating a new confirmable order.
    // Never delete — only CANCELED. Keeps Toss mid-auth orderId unique per attempt.
    await this.finalizeStaleReadyOrders(userId, product.id);

    const orderId = generateOrderId();
    const checkoutToken = randomBytes(24).toString('base64url');
    const checkoutTokenExpiresAt = new Date(Date.now() + CHECKOUT_TOKEN_TTL_MS);
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        productId: product.id,
        type: product.type,
        orderId,
        amount: product.price,
        status: PaymentStatus.READY,
        checkoutToken,
        checkoutTokenExpiresAt,
      },
    });

    this.logger.log(`PAYMENT_ORDER_CREATED paymentId=${payment.id} orderId=${orderId} userId=${userId}`);

    const scheme = resolveMobilePaymentScheme();
    const checkoutUrl = `${resolvePublicApiBase()}/payments/toss/checkout-page?token=${checkoutToken}`;

    return {
      paymentId: payment.id,
      orderId,
      amount: product.price,
      orderName: product.name,
      clientKey: settings.clientKey!,
      checkoutToken,
      checkoutUrl,
      successRedirectScheme: `${scheme}://payment/success`,
      failRedirectScheme: `${scheme}://payment/fail`,
    };
  }

  async getCheckoutPageHtml(token: string, callbackMode: CheckoutCallbackMode = 'app'): Promise<string> {
    const payment = await this.prisma.payment.findFirst({
      where: { checkoutToken: token },
      include: { product: true },
    });
    if (!payment) throw new NotFoundException('checkout_not_found');
    if (
      payment.checkoutTokenExpiresAt &&
      payment.checkoutTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('checkout_token_expired');
    }
    if (payment.status !== PaymentStatus.READY) {
      throw new BadRequestException('checkout_not_available');
    }

    const settings = await this.loadProviderSettings();
    if (!settings.clientKey) throw new ServiceUnavailableException('payment_not_configured');

    const { successUrl, failUrl } = resolveCheckoutRedirectUrls(callbackMode);
    const appScheme = `${resolveMobilePaymentScheme()}://`;

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>JJOIN 결제</title>
  <script src="https://js.tosspayments.com/v2/standard"></script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; background: #0f1419; color: #f5f7fa; }
    .card { max-width: 420px; margin: 0 auto; padding: 20px; border-radius: 12px; background: #1a222d; }
    /* Club Minimal CTA: action.primary (#D4AF37) + text.onGold (#09090A) */
    button { width: 100%; padding: 14px; border: 0; border-radius: 10px; font-size: 16px; font-weight: 600;
      background: #D4AF37; color: #09090A; cursor: pointer; }
    button:disabled { opacity: 0.5; }
    .meta { margin-bottom: 16px; line-height: 1.5; }
    .error { color: #ff6b6b; margin-top: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="meta">
      <strong>${escapeHtml(payment.product.name)}</strong><br />
      결제 금액: ${payment.amount.toLocaleString('ko-KR')}원
    </div>
    <button id="pay-btn" type="button">결제하기</button>
    <div id="error" class="error" hidden></div>
  </div>
  <script>
    const clientKey = ${JSON.stringify(settings.clientKey)};
    const tossPayments = TossPayments(clientKey);
    const payment = tossPayments.payment({ customerKey: TossPayments.ANONYMOUS });
    const btn = document.getElementById('pay-btn');
    const err = document.getElementById('error');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      err.hidden = true;
      try {
        await payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: ${payment.amount} },
          orderId: ${JSON.stringify(payment.orderId)},
          orderName: ${JSON.stringify(payment.product.name)},
          successUrl: ${JSON.stringify(successUrl)},
          failUrl: ${JSON.stringify(failUrl)},
          appScheme: ${JSON.stringify(appScheme)},
        });
      } catch (e) {
        btn.disabled = false;
        err.textContent = e && e.message ? e.message : '결제를 시작하지 못했습니다.';
        err.hidden = false;
      }
    });
  </script>
</body>
</html>`;
  }

  getWebViewReturnHtml(query: Record<string, string | string[] | undefined>): string {
    const outcome = String(query.outcome ?? 'success');
    const failed = outcome === 'fail';
    const orderId = String(query.orderId ?? '');
    const amount = String(query.amount ?? '');
    const paymentKey = String(query.paymentKey ?? '');
    const code = String(query.code ?? '');
    const message = String(query.message ?? '');
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>JJOIN 결제 ${failed ? '실패' : '처리 중'}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; background: #0f1419; color: #f5f7fa; }
    .card { max-width: 420px; margin: 0 auto; padding: 20px; border-radius: 12px; background: #1a222d; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${failed ? '결제 실패' : '결제 확인 중'}</h1>
    <p>${failed ? '결제가 완료되지 않았습니다.' : '앱에서 결제를 확인하고 있습니다…'}</p>
    ${orderId ? `<p>orderId: <code>${escapeHtml(orderId)}</code></p>` : ''}
    ${amount ? `<p>amount: <code>${escapeHtml(amount)}</code></p>` : ''}
    ${failed && code ? `<p>code: <code>${escapeHtml(code)}</code></p>` : ''}
    ${failed && message ? `<p>${escapeHtml(message)}</p>` : ''}
    ${!failed && paymentKey ? `<p hidden data-payment-key="${escapeHtml(paymentKey)}"></p>` : ''}
  </div>
</body>
</html>`;
  }

  async processWebCallback(
    query: Record<string, string | string[] | undefined>,
  ): Promise<{ statusCode: number; html: string }> {
    if (!isDevelopmentPaymentEnvironment()) {
      return {
        statusCode: 404,
        html: '<!DOCTYPE html><html><body><p>Not found</p></body></html>',
      };
    }

    const outcome = String(query.outcome ?? 'success');
    const failed = outcome === 'fail';
    const paymentKey = String(query.paymentKey ?? '').trim();
    const orderId = String(query.orderId ?? '').trim();
    const amountRaw = String(query.amount ?? '').trim();
    const code = String(query.code ?? '').trim();
    const message = String(query.message ?? '').trim();

    if (failed) {
      if (orderId) {
        const payment = await this.prisma.payment.findUnique({ where: { orderId } });
        if (payment && CONFIRMABLE_STATUSES.includes(payment.status as PaymentStatus)) {
          await this.markFailed(payment.id, 'toss_callback_fail', {
            code,
            message,
          });
        }
      }
      return {
        statusCode: 200,
        html: this.buildWebCallbackResultHtml({
          title: '결제 실패',
          failed: true,
          orderId,
          amount: amountRaw,
          code,
          message,
          detail: '결제가 완료되지 않았습니다. 코인·프리미엄은 지급되지 않습니다.',
        }),
      };
    }

    if (!paymentKey || !orderId || !amountRaw) {
      return {
        statusCode: 400,
        html: this.buildWebCallbackResultHtml({
          title: '결제 정보 부족',
          failed: true,
          orderId,
          amount: amountRaw,
          detail: 'Toss success callback 값이 올바르지 않습니다.',
        }),
      };
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        statusCode: 400,
        html: this.buildWebCallbackResultHtml({
          title: '결제 금액 오류',
          failed: true,
          orderId,
          amount: amountRaw,
          detail: '결제 금액이 올바르지 않습니다.',
        }),
      };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { product: true },
    });
    if (!payment) {
      return {
        statusCode: 404,
        html: this.buildWebCallbackResultHtml({
          title: '주문을 찾을 수 없습니다',
          failed: true,
          orderId,
          amount: amountRaw,
          detail: 'orderId에 해당하는 결제 주문이 없습니다.',
        }),
      };
    }

    try {
      const result = await this.confirmTossPayment(payment.userId, {
        paymentKey,
        orderId,
        amount,
      });
      const detailParts = [
        `상품: ${result.payment.productName ?? payment.product.name}`,
        `상태: ${result.payment.status}`,
        `금액: ${result.payment.amount.toLocaleString('ko-KR')}원`,
      ];
      if (result.coinCredited) {
        detailParts.push(`코인 지급: ${result.coinCredited}`);
      }
      if (result.premiumStatus?.expiresAt) {
        detailParts.push(`프리미엄 만료: ${result.premiumStatus.expiresAt}`);
      }
      return {
        statusCode: 200,
        html: this.buildWebCallbackResultHtml({
          title: '결제 완료',
          failed: false,
          orderId,
          amount: amountRaw,
          detail: detailParts.join(' · '),
        }),
      };
    } catch (e) {
      const reason =
        e instanceof BadRequestException || e instanceof ForbiddenException
          ? String((e.getResponse() as { message?: string })?.message ?? e.message)
          : 'payment_confirm_failed';
      this.logger.warn(
        `WEB_CALLBACK_CONFIRM_FAILED orderId=${orderId} reason=${reason}`,
      );
      return {
        statusCode: 400,
        html: this.buildWebCallbackResultHtml({
          title: '결제 승인 실패',
          failed: true,
          orderId,
          amount: amountRaw,
          detail: '서버 confirm에 실패했습니다. 결제 내역에서 상태를 확인해주세요.',
        }),
      };
    }
  }

  private buildWebCallbackResultHtml(input: {
    title: string;
    failed: boolean;
    orderId: string;
    amount: string;
    code?: string;
    message?: string;
    detail: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>JJOIN ${escapeHtml(input.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; background: #0f1419; color: #f5f7fa; }
    .card { max-width: 520px; margin: 0 auto; padding: 20px; border-radius: 12px; background: #1a222d; line-height: 1.6; }
    .ok { color: #7dd87d; }
    .bad { color: #ff6b6b; }
    code { word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="${input.failed ? 'bad' : 'ok'}">${escapeHtml(input.title)}</h1>
    ${input.orderId ? `<p>orderId: <code>${escapeHtml(input.orderId)}</code></p>` : ''}
    ${input.amount ? `<p>amount: <code>${escapeHtml(input.amount)}</code></p>` : ''}
    ${input.code ? `<p>code: <code>${escapeHtml(input.code)}</code></p>` : ''}
    ${input.message ? `<p>${escapeHtml(input.message)}</p>` : ''}
    <p>${escapeHtml(input.detail)}</p>
  </div>
</body>
</html>`;
  }

  async confirmTossPayment(
    userId: string,
    raw: unknown,
  ): Promise<{
    payment: PaymentDetailDto;
    premiumStatus?: { expiresAt: string; startedAt: string };
    coinCredited?: string;
  }> {
    const parsed = confirmTossPaymentSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_confirm_payment');

    const payment = await this.prisma.payment.findUnique({
      where: { orderId: parsed.data.orderId },
      include: { product: true },
    });
    if (!payment) throw new NotFoundException('payment_not_found');
    if (payment.userId !== userId) throw new ForbiddenException('payment_user_mismatch');

    if (payment.status === PaymentStatus.PAID) {
      return { payment: await this.getPaymentDetail(userId, payment.id) };
    }

    if (!CONFIRMABLE_STATUSES.includes(payment.status as PaymentStatus)) {
      throw new BadRequestException('payment_not_confirmable');
    }

    if (payment.amount !== parsed.data.amount) {
      await this.markFailed(payment.id, 'amount_mismatch');
      throw new BadRequestException('payment_amount_mismatch');
    }

    const settings = await this.loadProviderSettings();
    if (settings.environment === PaymentEnvironment.LIVE && process.env.NODE_ENV !== 'production') {
      throw new ForbiddenException('live_payment_not_allowed_in_non_production');
    }
    if (!settings.secretKeyEncrypted) {
      throw new ServiceUnavailableException('payment_secret_missing');
    }

    const secretKey = decryptCredential(settings.secretKeyEncrypted);
    this.logger.log(
      `PAYMENT_CONFIRM_REQUESTED paymentId=${payment.id} orderId=${payment.orderId}`,
    );

    await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: CONFIRMABLE_STATUSES },
      },
      data: { status: PaymentStatus.PROCESSING },
    });

    let tossResult;
    try {
      tossResult = await this.toss.confirmPayment(secretKey, {
        paymentKey: parsed.data.paymentKey,
        orderId: parsed.data.orderId,
        amount: parsed.data.amount,
      });
    } catch (e) {
      const payload =
        e instanceof TossPaymentError ? e.providerPayload : { message: String(e) };
      await this.markFailed(payment.id, 'toss_confirm_failed', payload);
      this.logger.warn(`PAYMENT_FAILED paymentId=${payment.id} reason=toss_confirm_failed`);
      throw new BadRequestException({
        code: 'payment_confirm_failed',
        message: '결제를 완료하지 못했습니다. 다시 시도해주세요.',
      });
    }

    if (tossResult.totalAmount !== payment.amount) {
      await this.markFailed(payment.id, 'toss_amount_mismatch', tossResult.raw);
      throw new BadRequestException('payment_amount_mismatch');
    }

    const fulfillment = await this.fulfillPaidPayment(payment.id, {
      paymentKey: tossResult.paymentKey,
      providerPayload: tossResult.raw,
    });

    this.logger.log(`PAYMENT_APPROVED paymentId=${payment.id}`);
    return fulfillment;
  }

  private async fulfillPaidPayment(
    paymentId: string,
    input: { paymentKey: string; providerPayload: Record<string, unknown> },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { product: true },
      });
      if (!payment) throw new NotFoundException('payment_not_found');

      if (payment.status === PaymentStatus.PAID) {
        const detail = await this.mapPaymentDetail(payment);
        return { payment: detail };
      }

      const approvedAt = new Date();
      const paidTransition = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: { in: CONFIRMABLE_STATUSES },
        },
        data: {
          status: PaymentStatus.PAID,
          paymentKey: input.paymentKey,
          approvedAt,
          providerPayload: input.providerPayload as Prisma.InputJsonValue,
        },
      });

      if (paidTransition.count === 0) {
        const current = await tx.payment.findUnique({
          where: { id: payment.id },
          include: { product: true },
        });
        if (current?.status === PaymentStatus.PAID) {
          return { payment: await this.mapPaymentDetail(current) };
        }
        throw new BadRequestException('payment_not_confirmable');
      }

      let coinCredited: string | undefined;
      let premiumStatus: { expiresAt: string; startedAt: string } | undefined;

      if (payment.type === PaymentProductType.COIN_CHARGE) {
        const coinAmount = payment.product.coinAmount;
        if (!coinAmount) throw new BadRequestException('invalid_coin_product');
        const amountStr = String(coinAmount);
        const result = await this.ledger.issueCoins(
          {
            userId: payment.userId,
            amount: amountStr,
            issuanceType: CoinIssuanceType.PURCHASE,
            idempotencyKey: `payment-purchase:${payment.id}`,
            referenceType: 'PAYMENT',
            referenceId: payment.id,
            reason: payment.product.name,
            metadata: {
              paymentId: payment.id,
              productId: payment.productId,
              provider: PaymentProviderKind.TOSS,
              orderId: payment.orderId,
            },
          },
          tx,
        );
        coinCredited = result.amount;
        this.logger.log(
          `COIN_PURCHASE_CREDITED paymentId=${payment.id} amount=${coinCredited} alreadyExists=${result.alreadyExists}`,
        );
      } else if (payment.type === PaymentProductType.PREMIUM_PASS) {
        const days = payment.product.premiumDays;
        if (!days) throw new BadRequestException('invalid_premium_product');
        const activation = await this.premium.activateOrExtendInTransaction(tx, {
          userId: payment.userId,
          paymentId: payment.id,
          premiumDays: days,
        });
        premiumStatus = {
          expiresAt: activation.expiresAt.toISOString(),
          startedAt: activation.startedAt.toISOString(),
        };
        this.logger.log(
          activation.extended
            ? `PREMIUM_EXTENDED paymentId=${payment.id}`
            : `PREMIUM_ACTIVATED paymentId=${payment.id}`,
        );
      }

      const updated = await tx.payment.findUnique({
        where: { id: payment.id },
        include: { product: true },
      });
      return {
        payment: await this.mapPaymentDetail(updated!),
        premiumStatus,
        coinCredited,
      };
    });
  }

  private async markFailed(
    paymentId: string,
    reason: string,
    payload?: Record<string, unknown>,
  ) {
    await this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        status: { in: [PaymentStatus.READY, PaymentStatus.PROCESSING] },
      },
      data: {
        status: PaymentStatus.FAILED,
        providerPayload: {
          failureReason: reason,
          ...(payload ?? {}),
        } as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * READY lifecycle:
   * - expired checkout token → CANCELED (checkout_token_expired)
   * - same user+product still READY → CANCELED (superseded_by_new_order)
   * Never deletes rows; never touches PAID/PROCESSING mid-confirm.
   */
  private async finalizeStaleReadyOrders(userId: string, productId: string): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.payment.updateMany({
      where: {
        userId,
        status: PaymentStatus.READY,
        checkoutTokenExpiresAt: { lt: now },
      },
      data: {
        status: PaymentStatus.CANCELED,
        canceledAt: now,
        providerPayload: { cancelReason: 'checkout_token_expired' } as Prisma.InputJsonValue,
      },
    });
    if (expired.count > 0) {
      this.logger.log(
        `PAYMENT_READY_EXPIRED count=${expired.count} userId=${userId}`,
      );
    }

    const superseded = await this.prisma.payment.updateMany({
      where: {
        userId,
        productId,
        status: PaymentStatus.READY,
      },
      data: {
        status: PaymentStatus.CANCELED,
        canceledAt: now,
        providerPayload: { cancelReason: 'superseded_by_new_order' } as Prisma.InputJsonValue,
      },
    });
    if (superseded.count > 0) {
      this.logger.log(
        `PAYMENT_READY_SUPERSEDED count=${superseded.count} userId=${userId} productId=${productId}`,
      );
    }
  }

  /** User abandoned checkout (back / close). Only READY → CANCELED. */
  async cancelReadyOrder(userId: string, paymentId: string): Promise<{ ok: true }> {
    const now = new Date();
    const result = await this.prisma.payment.updateMany({
      where: {
        id: paymentId,
        userId,
        status: PaymentStatus.READY,
      },
      data: {
        status: PaymentStatus.CANCELED,
        canceledAt: now,
        providerPayload: { cancelReason: 'user_cancelled_checkout' } as Prisma.InputJsonValue,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException('payment_not_cancelable');
    }
    this.logger.log(`PAYMENT_READY_CANCELED paymentId=${paymentId} userId=${userId}`);
    return { ok: true };
  }

  async listMyPayments(userId: string): Promise<PaymentListItemDto[]> {
    const rows = await this.prisma.payment.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.mapPaymentListItem(row));
  }

  async getPaymentDetail(userId: string, paymentId: string): Promise<PaymentDetailDto> {
    const row = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: { product: true },
    });
    if (!row) throw new NotFoundException('payment_not_found');
    return this.mapPaymentDetail(row);
  }

  async getAdminSettings(): Promise<AdminPaymentProviderSettingsDto> {
    const settings = await this.loadProviderSettings();
    return this.mapAdminSettings(settings);
  }

  async updateAdminSettings(raw: unknown) {
    const parsed = updateAdminPaymentProviderSettingsSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_payment_settings');

    const data = parsed.data;
    if (data.secretKey && !hasPaymentEncryptionKey()) {
      throw new BadRequestException('payment_encryption_key_missing');
    }

    const update: Prisma.PaymentProviderSettingsUpdateInput = {};
    if (data.enabled !== undefined) update.enabled = data.enabled;
    if (data.environment !== undefined) update.environment = data.environment;
    if (data.clientKey !== undefined) update.clientKey = data.clientKey;

    if (data.secretKey !== undefined) {
      if (data.secretKey === null || data.secretKey === '') {
        update.secretKeyEncrypted = null;
      } else {
        update.secretKeyEncrypted = encryptCredential(data.secretKey);
      }
    }

    const settings = await this.prisma.paymentProviderSettings.update({
      where: { id: 'default' },
      data: update,
    });
    return this.mapAdminSettings(settings);
  }

  async listAdminPayments(): Promise<AdminPaymentListItemDto[]> {
    const rows = await this.prisma.payment.findMany({
      include: {
        product: true,
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      ...this.mapPaymentListItem(row),
      userId: row.userId,
      userNickname: row.user.profile?.nickname ?? null,
      orderId: row.orderId,
    }));
  }

  async getAdminPayment(paymentId: string): Promise<AdminPaymentDetailDto> {
    const row = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        product: true,
        user: { include: { profile: true } },
      },
    });
    if (!row) throw new NotFoundException('payment_not_found');
    return {
      ...this.mapPaymentListItem(row),
      userId: row.userId,
      userNickname: row.user.profile?.nickname ?? null,
      orderId: row.orderId,
      provider: PaymentProviderKind.TOSS,
      paymentKeyMasked: row.paymentKey ? maskPaymentKey(row.paymentKey) : null,
      canceledAt: row.canceledAt?.toISOString() ?? null,
    };
  }

  async listAdminProducts(): Promise<PaymentProductDto[]> {
    const rows = await this.prisma.paymentProduct.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map(mapProduct);
  }

  async updateAdminProduct(productId: string, raw: unknown) {
    const parsed = updatePaymentProductSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_payment_product');
    const data = parsed.data;
    const row = await this.prisma.paymentProduct.update({
      where: { id: productId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.coinAmount !== undefined
          ? {
              coinAmount:
                data.coinAmount === null ? null : new Prisma.Decimal(data.coinAmount),
            }
          : {}),
        ...(data.premiumDays !== undefined ? { premiumDays: data.premiumDays } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });
    return mapProduct(row);
  }

  private async loadProviderSettings() {
    return this.prisma.paymentProviderSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  private mapAdminSettings(
    settings: {
      enabled: boolean;
      environment: string;
      clientKey: string | null;
      secretKeyEncrypted: string | null;
    },
  ): AdminPaymentProviderSettingsDto {
    const hasSecret = Boolean(settings.secretKeyEncrypted);
    let secretKeyMasked: string | null = null;
    if (hasSecret && settings.secretKeyEncrypted) {
      try {
        secretKeyMasked = maskSecretKey(decryptCredential(settings.secretKeyEncrypted));
      } catch {
        secretKeyMasked = '********';
      }
    }
    const envLabel = settings.environment === 'LIVE' ? 'LIVE' : 'TEST';
    const statusLabel = settings.enabled && settings.clientKey && hasSecret
      ? `${envLabel} 설정 완료`
      : '설정 필요';
    return {
      provider: PaymentProviderKind.TOSS,
      enabled: settings.enabled,
      environment: settings.environment as PaymentEnvironment,
      clientKey: settings.clientKey,
      secretKeyMasked,
      hasSecretKey: hasSecret,
      statusLabel,
    };
  }

  private mapPaymentListItem(
    row: {
      id: string;
      type: string;
      amount: number;
      status: string;
      approvedAt: Date | null;
      createdAt: Date;
      product: { name: string };
    },
  ): PaymentListItemDto {
    return {
      id: row.id,
      type: row.type as PaymentProductType,
      productName: row.product.name,
      amount: row.amount,
      status: row.status as PaymentStatus,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async mapPaymentDetail(
    row: {
      id: string;
      type: string;
      amount: number;
      status: string;
      approvedAt: Date | null;
      createdAt: Date;
      orderId: string;
      product: { name: string };
    },
  ): Promise<PaymentDetailDto> {
    return {
      ...this.mapPaymentListItem(row),
      orderId: row.orderId,
      provider: PaymentProviderKind.TOSS,
    };
  }
}

function maskPaymentKey(key: string): string {
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
