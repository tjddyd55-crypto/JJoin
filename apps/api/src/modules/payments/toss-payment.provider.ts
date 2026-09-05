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

export type TossBillingIssueInput = {
  authKey: string;
  customerKey: string;
};

export type TossBillingIssueResult = {
  billingKey: string;
  customerKey: string;
  cardCompany: string | null;
  cardNumberMasked: string | null;
  raw: Record<string, unknown>;
};

export type TossBillingChargeInput = {
  billingKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
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

  async issueBillingKey(
    secretKey: string,
    input: TossBillingIssueInput,
  ): Promise<TossBillingIssueResult> {
    const res = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authKey: input.authKey,
        customerKey: input.customerKey,
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
      throw new TossPaymentError(
        typeof raw.message === 'string' ? raw.message : 'toss_billing_issue_failed',
        res.status,
        raw,
      );
    }
    const card = (raw.card ?? {}) as Record<string, unknown>;
    return {
      billingKey: String(raw.billingKey ?? ''),
      customerKey: String(raw.customerKey ?? input.customerKey),
      cardCompany: typeof card.company === 'string' ? card.company : null,
      cardNumberMasked: typeof card.number === 'string' ? card.number : null,
      raw,
    };
  }

  async chargeBillingKey(
    secretKey: string,
    input: TossBillingChargeInput,
  ): Promise<TossConfirmResult> {
    const res = await fetch(
      `https://api.tosspayments.com/v1/billing/${encodeURIComponent(input.billingKey)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerKey: input.customerKey,
          amount: input.amount,
          orderId: input.orderId,
          orderName: input.orderName,
        }),
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
        typeof raw.message === 'string' ? raw.message : 'toss_billing_charge_failed',
        res.status,
        raw,
      );
    }
    return {
      paymentKey: String(raw.paymentKey ?? ''),
      orderId: String(raw.orderId ?? input.orderId),
      totalAmount: Number(raw.totalAmount ?? input.amount),
      status: String(raw.status ?? 'DONE'),
      raw,
    };
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
