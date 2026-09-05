import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { extendPremiumExpiry, isPremiumActive } from '@jjoin/domain';
import {
  PaymentEnvironment,
  PaymentProductType,
  PaymentStatus,
  PremiumPlanCode,
  type ConfirmPremiumBillingResponse,
  type InitPremiumSubscriptionResponse,
  type PremiumPlanSettingsDto,
  type PremiumStatusDto,
} from '@jjoin/types';
import {
  confirmPremiumBillingSchema,
  initPremiumSubscriptionSchema,
  updatePremiumPlanSettingsSchema,
} from '@jjoin/validation';
import { Prisma } from '@prisma/client';
import {
  decryptCredential,
  encryptCredential,
} from '../../common/credential-crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { PremiumService } from './premium.service';
import { TossPaymentProvider } from './toss-payment.provider';

function planDays(plan: PremiumPlanCode): number {
  return plan === PremiumPlanCode.PREMIUM_YEARLY ? 365 : 30;
}

function planLabel(plan: PremiumPlanCode): string {
  return plan === PremiumPlanCode.PREMIUM_YEARLY ? '연간 Premium' : '월간 Premium';
}

function generateCustomerKey(userId: string): string {
  return `JJOIN_${userId.replace(/-/g, '').slice(0, 20)}_${randomBytes(4).toString('hex')}`;
}

function generateOrderId(): string {
  return `JJ${randomBytes(12).toString('base64url')}`;
}

@Injectable()
export class PremiumSubscriptionService {
  private readonly logger = new Logger(PremiumSubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly premium: PremiumService,
    private readonly payments: PaymentService,
    private readonly toss: TossPaymentProvider,
  ) {}

  async getPlanSettings(): Promise<PremiumPlanSettingsDto> {
    const row = await this.ensurePlanSettings();
    const monthlyAnnual = row.monthlyPriceKrw * 12;
    const yearlySavingsPercent =
      monthlyAnnual > row.yearlyPriceKrw
        ? Math.round(((monthlyAnnual - row.yearlyPriceKrw) / monthlyAnnual) * 100)
        : null;
    return {
      monthlyEnabled: row.monthlyEnabled,
      monthlyPriceKrw: row.monthlyPriceKrw,
      yearlyEnabled: row.yearlyEnabled,
      yearlyPriceKrw: row.yearlyPriceKrw,
      yearlySavingsPercent,
    };
  }

  async updatePlanSettings(raw: unknown, actorUserId?: string): Promise<PremiumPlanSettingsDto> {
    const parsed = updatePremiumPlanSettingsSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_premium_plan_settings');
    await this.prisma.premiumPlanSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        monthlyEnabled: parsed.data.monthlyEnabled ?? true,
        monthlyPriceKrw: parsed.data.monthlyPriceKrw ?? 9900,
        yearlyEnabled: parsed.data.yearlyEnabled ?? true,
        yearlyPriceKrw: parsed.data.yearlyPriceKrw ?? 99000,
        updatedBy: actorUserId ?? null,
      },
      update: {
        ...(parsed.data.monthlyEnabled !== undefined
          ? { monthlyEnabled: parsed.data.monthlyEnabled }
          : {}),
        ...(parsed.data.monthlyPriceKrw !== undefined
          ? { monthlyPriceKrw: parsed.data.monthlyPriceKrw }
          : {}),
        ...(parsed.data.yearlyEnabled !== undefined
          ? { yearlyEnabled: parsed.data.yearlyEnabled }
          : {}),
        ...(parsed.data.yearlyPriceKrw !== undefined
          ? { yearlyPriceKrw: parsed.data.yearlyPriceKrw }
          : {}),
        updatedBy: actorUserId ?? null,
      },
    });
    return this.getPlanSettings();
  }

  async initSubscription(
    userId: string,
    raw: unknown,
  ): Promise<InitPremiumSubscriptionResponse> {
    const parsed = initPremiumSubscriptionSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_premium_subscription');

    const settings = await this.getPlanSettings();
    const plan = parsed.data.plan as PremiumPlanCode;
    const amount =
      plan === PremiumPlanCode.PREMIUM_YEARLY
        ? settings.yearlyPriceKrw
        : settings.monthlyPriceKrw;
    const enabled =
      plan === PremiumPlanCode.PREMIUM_YEARLY
        ? settings.yearlyEnabled
        : settings.monthlyEnabled;
    if (!enabled) throw new BadRequestException('premium_plan_not_available');

    const publicConfig = await this.payments.getPublicConfig();
    if (!publicConfig.enabled || !publicConfig.clientKey) {
      throw new ServiceUnavailableException('payment_not_configured');
    }

    const existing = await this.prisma.premiumBillingAuthorization.findUnique({
      where: { userId },
    });
    const customerKey = existing?.customerKey ?? generateCustomerKey(userId);

    if (!existing) {
      await this.prisma.premiumBillingAuthorization.create({
        data: {
          userId,
          customerKey,
          billingKeyEncrypted: encryptCredential('pending'),
        },
      });
    }

    const base = (
      process.env.PUBLIC_API_BASE_URL ??
      process.env.API_PUBLIC_BASE_URL ??
      'http://127.0.0.1:3000'
    ).replace(/\/$/, '');
    const billingAuthUrl = `${base}/payments/toss/billing-auth-page?customerKey=${encodeURIComponent(customerKey)}&plan=${plan}`;

    return {
      customerKey,
      clientKey: publicConfig.clientKey,
      billingAuthUrl,
      plan,
      amount,
      orderName: planLabel(plan),
    };
  }

  async confirmBilling(
    userId: string,
    raw: unknown,
  ): Promise<ConfirmPremiumBillingResponse> {
    const parsed = confirmPremiumBillingSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException('invalid_premium_billing_confirm');

    const auth = await this.prisma.premiumBillingAuthorization.findUnique({
      where: { userId },
    });
    if (!auth || auth.customerKey !== parsed.data.customerKey) {
      throw new ForbiddenBillingError();
    }

    const plan = parsed.data.plan as PremiumPlanCode;
    const planSettings = await this.getPlanSettings();
    const amount =
      plan === PremiumPlanCode.PREMIUM_YEARLY
        ? planSettings.yearlyPriceKrw
        : planSettings.monthlyPriceKrw;

    const providerSettings = await this.payments.loadProviderSettingsForInternal();
    if (!providerSettings.secretKeyEncrypted) {
      throw new ServiceUnavailableException('payment_secret_missing');
    }
    const secretKey = decryptCredential(providerSettings.secretKeyEncrypted);

    const billing = await this.toss.issueBillingKey(secretKey, {
      authKey: parsed.data.authKey,
      customerKey: parsed.data.customerKey,
    });

    await this.prisma.premiumBillingAuthorization.update({
      where: { userId },
      data: {
        billingKeyEncrypted: encryptCredential(billing.billingKey),
        cardCompany: billing.cardCompany,
        cardNumberMasked: billing.cardNumberMasked,
        environment: providerSettings.environment as PaymentEnvironment,
      },
    });

    const premiumStatus = await this.chargeSubscription({
      userId,
      plan,
      amount,
      billingKey: billing.billingKey,
      secretKey,
      idempotencyKey: `premium-subscribe:${userId}:${plan}:${parsed.data.authKey}`,
    });

    return { premiumStatus };
  }

  async cancelAtPeriodEnd(userId: string): Promise<PremiumStatusDto> {
    const row = await this.prisma.premiumMembership.findUnique({ where: { userId } });
    if (!row || !isPremiumActive(row.expiresAt)) {
      throw new NotFoundException('premium_not_active');
    }
    await this.prisma.premiumMembership.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
    return this.premium.getStatus(userId);
  }

  async processDueRenewals(limit = 20): Promise<{ processed: number }> {
    const now = new Date();
    const due = await this.prisma.premiumMembership.findMany({
      where: {
        cancelAtPeriodEnd: false,
        nextBillingAt: { lte: now },
        status: 'ACTIVE',
      },
      take: limit,
      include: { billingAuthorization: true },
    });

    let processed = 0;
    for (const membership of due) {
      if (!membership.plan || !membership.billingAuthorization) continue;
      try {
        const planSettings = await this.getPlanSettings();
        const amount =
          membership.plan === 'PREMIUM_YEARLY'
            ? planSettings.yearlyPriceKrw
            : planSettings.monthlyPriceKrw;
        const providerSettings = await this.payments.loadProviderSettingsForInternal();
        if (!providerSettings.secretKeyEncrypted) continue;
        const secretKey = decryptCredential(providerSettings.secretKeyEncrypted);
        const billingKey = decryptCredential(membership.billingAuthorization.billingKeyEncrypted);
        await this.chargeSubscription({
          userId: membership.userId,
          plan: membership.plan as PremiumPlanCode,
          amount,
          billingKey,
          secretKey,
          idempotencyKey: `premium-renewal:${membership.id}:${membership.nextBillingAt?.toISOString()}`,
        });
        processed += 1;
      } catch (e) {
        this.logger.warn(
          `PREMIUM_RENEWAL_FAILED userId=${membership.userId} reason=${String(e)}`,
        );
      }
    }
    return { processed };
  }

  private async chargeSubscription(input: {
    userId: string;
    plan: PremiumPlanCode;
    amount: number;
    billingKey: string;
    secretKey: string;
    idempotencyKey: string;
  }): Promise<PremiumStatusDto> {
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        userId: input.userId,
        status: PaymentStatus.PAID,
        providerPayload: {
          path: ['idempotencyKey'],
          equals: input.idempotencyKey,
        },
      },
    });
    if (existingPayment) {
      return this.premium.getStatus(input.userId);
    }

    const orderId = generateOrderId();
    const orderName = planLabel(input.plan);
    const tossResult = await this.toss.chargeBillingKey(input.secretKey, {
      billingKey: input.billingKey,
      customerKey: (
        await this.prisma.premiumBillingAuthorization.findUniqueOrThrow({
          where: { userId: input.userId },
        })
      ).customerKey,
      orderId,
      orderName,
      amount: input.amount,
    });

    const days = planDays(input.plan);
    const now = new Date();
    const nextBillingAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: input.userId,
          productId: await this.ensureSubscriptionProductId(tx, input.plan),
          type: PaymentProductType.PREMIUM_SUBSCRIPTION,
          orderId,
          amount: input.amount,
          status: PaymentStatus.PAID,
          paymentKey: tossResult.paymentKey,
          approvedAt: now,
          providerPayload: {
            plan: input.plan,
            idempotencyKey: input.idempotencyKey,
            billing: true,
            raw: tossResult.raw,
          } as Prisma.InputJsonValue,
        },
      });

      const auth = await tx.premiumBillingAuthorization.findUniqueOrThrow({
        where: { userId: input.userId },
      });
      const existing = await tx.premiumMembership.findUnique({ where: { userId: input.userId } });
      const expiresAt = extendPremiumExpiry(existing?.expiresAt, days, now);

      if (existing) {
        await tx.premiumMembership.update({
          where: { userId: input.userId },
          data: {
            status: 'ACTIVE',
            plan: input.plan,
            expiresAt,
            nextBillingAt,
            cancelAtPeriodEnd: false,
            lastPaymentId: payment.id,
            billingAuthorizationId: auth.id,
            startedAt: isPremiumActive(existing.expiresAt, now) ? existing.startedAt : now,
          },
        });
      } else {
        await tx.premiumMembership.create({
          data: {
            userId: input.userId,
            status: 'ACTIVE',
            plan: input.plan,
            startedAt: now,
            expiresAt,
            nextBillingAt,
            lastPaymentId: payment.id,
            billingAuthorizationId: auth.id,
          },
        });
      }
    });

    this.logger.log(`PREMIUM_SUBSCRIPTION_CHARGED userId=${input.userId} plan=${input.plan}`);
    return this.premium.getStatus(input.userId);
  }

  private async ensureSubscriptionProductId(
    tx: Prisma.TransactionClient,
    plan: PremiumPlanCode,
  ): Promise<string> {
    const code =
      plan === PremiumPlanCode.PREMIUM_YEARLY ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
    const product = await tx.paymentProduct.upsert({
      where: { code },
      create: {
        code,
        type: PaymentProductType.PREMIUM_SUBSCRIPTION,
        name: planLabel(plan),
        price: 0,
        premiumDays: planDays(plan),
        active: true,
        sortOrder: plan === PremiumPlanCode.PREMIUM_YEARLY ? 201 : 200,
      },
      update: {},
    });
    return product.id;
  }

  private async ensurePlanSettings() {
    return this.prisma.premiumPlanSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }
}

class ForbiddenBillingError extends BadRequestException {
  constructor() {
    super('billing_customer_mismatch');
  }
}
