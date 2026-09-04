/** Server-only Naver Login credentials — never expose client secret to mobile. */
export function resolveNaverLoginCredentials(): { clientId: string; clientSecret: string } {
  const clientId = (process.env.NAVER_LOGIN_CLIENT_ID ?? '').trim();
  const clientSecret = (process.env.NAVER_LOGIN_CLIENT_SECRET ?? '').trim();
  return { clientId, clientSecret };
}

export function isNaverLoginConfigured(): boolean {
  const { clientId, clientSecret } = resolveNaverLoginCredentials();
  return Boolean(clientId && clientSecret);
}
