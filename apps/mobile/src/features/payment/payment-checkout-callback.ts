export type ParsedBillingAuthCallback = {
  authKey: string;
  customerKey: string;
  failed: boolean;
};

export function parseBillingAuthCallbackUrl(url: string): ParsedBillingAuthCallback | null {
  try {
    const parsed = new URL(url);
    const failed =
      parsed.pathname.includes('fail') ||
      parsed.searchParams.get('outcome') === 'fail' ||
      parsed.searchParams.get('code');
    const authKey = parsed.searchParams.get('authKey');
    const customerKey = parsed.searchParams.get('customerKey');
    if (!authKey || !customerKey) return null;
    return { authKey, customerKey, failed: Boolean(failed) };
  } catch {
    return null;
  }
}

export type ParsedPaymentCallback = {
  paymentKey: string;
  orderId: string;
  amount: number;
  failed: boolean;
};

export type PaymentCallbackMatch =
  | { kind: 'success'; callback: ParsedPaymentCallback }
  | { kind: 'fail'; callback: ParsedPaymentCallback }
  | { kind: 'none' };

const DEFAULT_API_HOST_SUFFIXES = ['up.railway.app'] as const;

const TOSS_HOST_SUFFIXES = ['tosspayments.com'] as const;

function parseHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostnameAllowed(hostname: string, extraApiHost?: string | null): boolean {
  if (extraApiHost && (hostname === extraApiHost || hostname.endsWith(`.${extraApiHost}`))) {
    return true;
  }
  if (DEFAULT_API_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true;
  if (TOSS_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  return false;
}

export function parsePaymentCallbackUrl(url: string): ParsedPaymentCallback | null {
  try {
    const parsed = new URL(url);
    const failed =
      parsed.pathname.includes('fail') ||
      parsed.hostname === 'fail' ||
      parsed.searchParams.get('outcome') === 'fail';
    const paymentKey = parsed.searchParams.get('paymentKey');
    const orderId = parsed.searchParams.get('orderId');
    const amount = Number(parsed.searchParams.get('amount'));
    if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) return null;
    return { paymentKey, orderId, amount, failed };
  } catch {
    return null;
  }
}

export function matchPaymentCallbackUrl(
  url: string,
  successRedirectPrefix: string,
  failRedirectPrefix: string,
): PaymentCallbackMatch {
  const normalized = url.trim();
  if (normalized.startsWith(successRedirectPrefix)) {
    const callback = parsePaymentCallbackUrl(normalized);
    if (!callback || callback.failed) return { kind: 'none' };
    return { kind: 'success', callback };
  }
  if (normalized.startsWith(failRedirectPrefix)) {
    const callback = parsePaymentCallbackUrl(normalized);
    if (!callback) return { kind: 'fail', callback: { paymentKey: '', orderId: '', amount: 0, failed: true } };
    return { kind: 'fail', callback: { ...callback, failed: true } };
  }
  return { kind: 'none' };
}

/**
 * @deprecated Prefer classifyCheckoutNavigation — kept for host allowlist tests.
 * During live checkout, http(s) card-issuer pages must load; custom schemes are
 * handled by payment-checkout-external-nav.
 */
export function isAllowedCheckoutNavigation(url: string, apiBaseUrl: string): boolean {
  const normalized = url.trim();
  if (!normalized || normalized === 'about:blank') return true;
  if (normalized.startsWith('jjoin://') || normalized.startsWith('jjoindev://')) return true;

  const hostname = parseHostname(normalized);
  if (!hostname) return false;

  let apiHost: string | null = null;
  try {
    apiHost = new URL(apiBaseUrl).hostname.toLowerCase();
  } catch {
    apiHost = null;
  }

  return hostnameAllowed(hostname, apiHost);
}
