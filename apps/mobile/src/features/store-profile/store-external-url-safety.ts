const SAFE_EXTERNAL_SCHEMES = /^https?:\/\//i;

export function isSafeExternalUrl(url: string): boolean {
  const trimmed = url.trim();
  return SAFE_EXTERNAL_SCHEMES.test(trimmed);
}
