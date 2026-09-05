import { Injectable } from '@nestjs/common';
import { NotificationType, PremiumPlanCode } from '@prisma/client';
import { NotificationEventService } from '../notifications/notification-event.service';

function planLabelKo(plan: PremiumPlanCode | string | null): string {
  if (plan === PremiumPlanCode.PREMIUM_YEARLY) return '연간 Premium';
  if (plan === PremiumPlanCode.PREMIUM_MONTHLY) return '월간 Premium';
  return 'Premium';
}

@Injectable()
export class BillingNotificationService {
  constructor(private readonly events: NotificationEventService) {}

  notifyCoinPurchaseCompleted(input: {
    userId: string;
    paymentId: string;
    coinAmount: string;
  }): void {
    void this.events.enqueueSafe({
      userId: input.userId,
      type: NotificationType.COIN_PURCHASE_COMPLETED,
      title: '코인 충전 완료',
      body: `${input.coinAmount} Coin이 충전되었습니다.`,
      data: { route: 'wallet', paymentId: input.paymentId },
      eventKey: `coin-purchase:${input.paymentId}`,
    });
  }

  notifyPremiumActivated(input: {
    userId: string;
    paymentId: string;
    plan: PremiumPlanCode | string;
    expiresAt: string;
  }): void {
    void this.events.enqueueSafe({
      userId: input.userId,
      type: NotificationType.PREMIUM_SUBSCRIPTION_ACTIVATED,
      title: 'Premium 가입 완료',
      body: `${planLabelKo(input.plan)} 이용이 시작되었습니다.`,
      data: { route: 'premium', paymentId: input.paymentId, expiresAt: input.expiresAt },
      eventKey: `premium-activate:${input.paymentId}`,
    });
  }

  notifyPremiumRenewalSucceeded(input: {
    userId: string;
    paymentId: string;
    plan: PremiumPlanCode | string;
    expiresAt: string;
    billingCycleKey: string;
  }): void {
    void this.events.enqueueSafe({
      userId: input.userId,
      type: NotificationType.PREMIUM_RENEWAL_SUCCEEDED,
      title: 'Premium 갱신 완료',
      body: `${planLabelKo(input.plan)} 이용 기간이 연장되었습니다.`,
      data: { route: 'premium', paymentId: input.paymentId, expiresAt: input.expiresAt },
      eventKey: `premium-renewal:${input.billingCycleKey}`,
    });
  }

  notifyPremiumRenewalFailed(input: {
    userId: string;
    billingCycleKey: string;
  }): void {
    void this.events.enqueueSafe({
      userId: input.userId,
      type: NotificationType.PREMIUM_RENEWAL_FAILED,
      title: 'Premium 결제 실패',
      body: '자동 결제에 실패했습니다. 결제 수단을 확인해주세요.',
      data: { route: 'premium' },
      eventKey: `premium-renewal-failed:${input.billingCycleKey}`,
    });
  }

  notifyPremiumCancelScheduled(input: {
    userId: string;
    expiresAt: string;
  }): void {
    void this.events.enqueueSafe({
      userId: input.userId,
      type: NotificationType.PREMIUM_CANCEL_SCHEDULED,
      title: 'Premium 해지 예약',
      body: '현재 이용 기간 종료 후 Premium이 해지됩니다.',
      data: { route: 'premium', expiresAt: input.expiresAt },
      eventKey: `premium-cancel:${input.userId}:${input.expiresAt}`,
    });
  }
}
