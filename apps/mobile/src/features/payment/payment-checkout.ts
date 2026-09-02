import * as WebBrowser from 'expo-web-browser';
import type { ApiClient } from '@jjoin/api-client';
import type { PaymentDetailDto, PremiumStatusDto } from '@jjoin/types';

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

function parseCallbackUrl(url: string): {
  paymentKey: string;
  orderId: string;
  amount: number;
  failed: boolean;
} | null {
  try {
    const parsed = new URL(url);
    const failed = parsed.pathname.includes('fail') || parsed.hostname === 'fail';
    const paymentKey = parsed.searchParams.get('paymentKey');
    const orderId = parsed.searchParams.get('orderId');
    const amount = Number(parsed.searchParams.get('amount'));
    if (!paymentKey || !orderId || !Number.isFinite(amount)) return null;
    return { paymentKey, orderId, amount, failed };
  } catch {
    return null;
  }
}

export async function runPaymentCheckout(
  api: ApiClient,
  productId: string,
): Promise<PaymentCheckoutResult> {
  const order = await api.createPaymentOrder({ productId });
  const session = await WebBrowser.openAuthSessionAsync(
    order.checkoutUrl,
    order.successRedirectScheme,
  );
  if (session.type !== 'success' || !session.url) {
    return { ok: false, reason: session.type === 'cancel' ? 'cancelled' : 'invalid_callback' };
  }

  const callback = parseCallbackUrl(session.url);
  if (!callback) return { ok: false, reason: 'invalid_callback' };
  if (callback.failed) return { ok: false, reason: 'cancelled' };

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
