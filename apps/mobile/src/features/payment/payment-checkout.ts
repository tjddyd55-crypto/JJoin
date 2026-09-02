import type { ApiClient } from '@jjoin/api-client';
import type { PaymentDetailDto, PremiumStatusDto } from '@jjoin/types';
import type { ParsedPaymentCallback } from './payment-checkout-callback';

export type PaymentCheckoutSuccess = {
  payment: PaymentDetailDto;
  coinCredited?: string;
  premiumStatus?: PremiumStatusDto;
};

export type PaymentCheckoutFailureReason =
  | 'cancelled'
  | 'confirm_failed'
  | 'invalid_callback'
  | 'network';

export type PaymentCheckoutResult =
  | { ok: true; data: PaymentCheckoutSuccess }
  | { ok: false; reason: PaymentCheckoutFailureReason };

export async function confirmPaymentFromCallback(
  api: ApiClient,
  callback: ParsedPaymentCallback,
): Promise<PaymentCheckoutResult> {
  if (callback.failed) {
    return { ok: false, reason: 'cancelled' };
  }

  try {
    const confirmed = await api.confirmTossPayment({
      paymentKey: callback.paymentKey,
      orderId: callback.orderId,
      amount: callback.amount,
    });
    return {
      ok: true,
      data: {
        payment: confirmed.payment,
        coinCredited: confirmed.coinCredited,
        premiumStatus: confirmed.premiumStatus
          ? {
              active: true,
              startedAt: confirmed.premiumStatus.startedAt,
              expiresAt: confirmed.premiumStatus.expiresAt,
              remainingDays: null,
            }
          : undefined,
      },
    };
  } catch {
    return { ok: false, reason: 'confirm_failed' };
  }
}
