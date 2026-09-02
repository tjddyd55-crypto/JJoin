/**
 * In-app payment return handoff.
 * Avoids stacking a second /my/coin-charge via router.replace after checkout.
 */

export type CoinChargePaymentHandoff = {
  credited: string;
  balance: string;
};

let coinChargeHandoff: CoinChargePaymentHandoff | null = null;

export function setCoinChargePaymentHandoff(value: CoinChargePaymentHandoff): void {
  coinChargeHandoff = value;
}

export function consumeCoinChargePaymentHandoff(): CoinChargePaymentHandoff | null {
  const value = coinChargeHandoff;
  coinChargeHandoff = null;
  return value;
}
