import { Injectable, Logger } from '@nestjs/common';

export type TossConfirmInput = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export type TossConfirmResult = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
  raw: Record<string, unknown>;
};

export type TossCancelInput = {
  paymentKey: string;
  cancelReason: string;
};

@Injectable()
export class TossPaymentProvider {
  private readonly logger = new Logger(TossPaymentProvider.name);

  async confirmPayment(secretKey: string, input: TossConfirmInput): Promise<TossConfirmResult> {
    const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: input.amount,
      }),
    });
    const rawText = await res.text();
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      raw = { message: rawText.slice(0, 200) };
    }
    if (!res.ok) {
      this.logger.warn(
        `toss_confirm_failed orderId=${input.orderId} status=${res.status}`,
      );
      const message =
        typeof raw.message === 'string' ? raw.message : 'toss_confirm_failed';
      throw new TossPaymentError(message, res.status, raw);
    }
    const totalAmount = Number(raw.totalAmount);
    if (!Number.isFinite(totalAmount)) {
      throw new TossPaymentError('toss_invalid_amount', 500, raw);
    }
    return {
      paymentKey: String(raw.paymentKey ?? input.paymentKey),
      orderId: String(raw.orderId ?? input.orderId),
      totalAmount,
      status: String(raw.status ?? 'DONE'),
      raw,
    };
  }

  async getPaymentByOrderId(
    secretKey: string,
    orderId: string,
  ): Promise<TossConfirmResult> {
    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        },
      },
    );
    const rawText = await res.text();
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      raw = { message: rawText.slice(0, 200) };
    }
    if (!res.ok) {
      throw new TossPaymentError(
        typeof raw.message === 'string' ? raw.message : 'toss_lookup_failed',
        res.status,
        raw,
      );
    }
    return {
      paymentKey: String(raw.paymentKey ?? ''),
      orderId: String(raw.orderId ?? orderId),
      totalAmount: Number(raw.totalAmount),
      status: String(raw.status ?? ''),
      raw,
    };
  }

  async cancelPayment(secretKey: string, input: TossCancelInput): Promise<Record<string, unknown>> {
    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/${encodeURIComponent(input.paymentKey)}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelReason: input.cancelReason }),
      },
    );
    const rawText = await res.text();
    const raw = JSON.parse(rawText) as Record<string, unknown>;
    if (!res.ok) {
      throw new TossPaymentError(
        typeof raw.message === 'string' ? raw.message : 'toss_cancel_failed',
        res.status,
        raw,
      );
    }
    return raw;
  }
}

export class TossPaymentError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly providerPayload: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'TossPaymentError';
  }
}
