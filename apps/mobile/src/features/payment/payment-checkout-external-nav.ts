/**
 * Toss WebView App-to-App navigation classifier.
 * Sensitive query/body values must never be logged.
 */

/** Official Toss WebView app schemes (docs.tosspayments.com/guides/v2/webview). */
export const TOSS_PAYMENT_APP_SCHEMES = [
  'supertoss',
  'kb-acp',
  'liivbank',
  'newliiv',
  'kbbank',
  'nhappcardansimclick',
  'nhallonepayansimclick',
  'nonghyupcardansimclick',
  'lottesmartpay',
  'lotteappcard',
  'mpocket.online.ansimclick',
  'mpocket.ansimclick.cert',
  'vguardstart',
  'samsungpay',
  'monimopay',
  'monimopayauth',
  'shinhan-sr-ansimclick',
  'smshinhanansimclick',
  'com.wooricard.wcard',
  'newsmartpib',
  'citispay',
  'citicardappkr',
  'citimobileapp',
  'cloudpay',
  'hanawalletmembers',
  'hdcardappcardansimclick',
  'smhyundaiansimclick',
  'shinsegaeeasypayment',
  'payco',
  'lpayapp',
  'ispmobile',
  'kakaobank',
] as const;

export type CheckoutNavKind =
  | 'webview_http'
  | 'merchant_callback'
  | 'intent'
  | 'payment_app'
  | 'market'
  | 'about'
  | 'block';

export type CheckoutNavDecision = {
  kind: CheckoutNavKind;
  /** Safe to open outside WebView (no secrets). */
  openUrl?: string;
  /** Intent package name when present. */
  packageName?: string | null;
  /** Intent fallback URL (https) when app missing. */
  fallbackUrl?: string | null;
  /** Scheme only — safe for diagnostics. */
  scheme?: string | null;
};

function extractScheme(url: string): string | null {
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
}

/**
 * Convert Android intent:// URL to an app deep link + optional market fallback.
 * Does not return browser_fallback query payloads that may contain payment tokens in logs —
 * fallback URL is returned for Linking only.
 */
export function convertAndroidIntentUrl(intentUrl: string): {
  appLink: string | null;
  packageName: string | null;
  fallbackUrl: string | null;
  scheme: string | null;
} {
  const raw = intentUrl.trim();
  if (!raw.toLowerCase().startsWith('intent:')) {
    return { appLink: null, packageName: null, fallbackUrl: null, scheme: null };
  }

  const hashIdx = raw.indexOf('#Intent;');
  const body = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const params = hashIdx >= 0 ? raw.slice(hashIdx + '#Intent;'.length) : '';

  let scheme: string | null = null;
  let packageName: string | null = null;
  let fallbackUrl: string | null = null;

  for (const part of params.split(';')) {
    if (!part || part === 'end') continue;
    if (part.startsWith('scheme=')) scheme = part.slice('scheme='.length) || null;
    else if (part.startsWith('package=')) packageName = part.slice('package='.length) || null;
    else if (part.startsWith('S.browser_fallback_url=')) {
      try {
        fallbackUrl = decodeURIComponent(part.slice('S.browser_fallback_url='.length));
      } catch {
        fallbackUrl = part.slice('S.browser_fallback_url='.length);
      }
    }
  }

  let appLink: string | null = null;
  if (body.toLowerCase().startsWith('intent://')) {
    const rest = body.slice('intent://'.length);
    if (scheme) appLink = `${scheme}://${rest}`;
  } else if (body.toLowerCase().startsWith('intent:')) {
    const rest = body.slice('intent:'.length);
    if (rest.includes('://')) appLink = rest;
    else if (scheme) appLink = `${scheme}://${rest}`;
  }

  return { appLink, packageName, fallbackUrl, scheme };
}

function isPaymentAppScheme(scheme: string): boolean {
  return (TOSS_PAYMENT_APP_SCHEMES as readonly string[]).includes(scheme);
}

export function classifyCheckoutNavigation(
  url: string,
  merchantSchemes: readonly string[] = ['jjoin', 'jjoindev'],
): CheckoutNavDecision {
  const normalized = url.trim();
  if (!normalized || normalized === 'about:blank') {
    return { kind: 'about', scheme: 'about' };
  }

  const scheme = extractScheme(normalized);
  if (!scheme) return { kind: 'block', scheme: null };

  if (scheme === 'http' || scheme === 'https') {
    return { kind: 'webview_http', scheme };
  }

  if (merchantSchemes.includes(scheme)) {
    return { kind: 'merchant_callback', scheme, openUrl: normalized };
  }

  if (scheme === 'intent') {
    const converted = convertAndroidIntentUrl(normalized);
    return {
      kind: 'intent',
      scheme: converted.scheme ?? 'intent',
      openUrl: converted.appLink ?? undefined,
      packageName: converted.packageName,
      fallbackUrl: converted.fallbackUrl,
    };
  }

  if (scheme === 'market') {
    return { kind: 'market', scheme, openUrl: normalized };
  }

  if (isPaymentAppScheme(scheme)) {
    return { kind: 'payment_app', scheme, openUrl: normalized };
  }

  return { kind: 'block', scheme };
}

/** Whether WebView should load this URL in-document. */
export function shouldLoadInWebView(decision: CheckoutNavDecision): boolean {
  return decision.kind === 'webview_http' || decision.kind === 'about';
}

/** Resolve the best Linking URL for external app launch. */
export function resolveExternalOpenUrl(decision: CheckoutNavDecision): string | null {
  if (decision.kind === 'intent') {
    return decision.openUrl ?? decision.fallbackUrl ?? null;
  }
  if (decision.kind === 'payment_app' || decision.kind === 'market') {
    return decision.openUrl ?? null;
  }
  return null;
}
