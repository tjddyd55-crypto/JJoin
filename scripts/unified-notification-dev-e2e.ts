/**
 * DEV API E2E for unified notification acceptance (inbox + prefs).
 * Does not send Production pushes. FCM tray is optional.
 *
 * Usage: pnpm exec tsx scripts/unified-notification-dev-e2e.ts
 */
const API = process.env.API_BASE_URL ?? process.env.DEV_API_BASE_URL ?? 'http://127.0.0.1:3000';

type Json = Record<string, unknown>;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function request(
  path: string,
  opts: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Json> {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
    body: opts.body == null ? undefined : JSON.stringify(opts.body),
  });
  const json = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) {
    throw new Error(`${opts.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function mockSignIn(persona: string): Promise<string> {
  const json = await request('/auth/social/mock-sign-in', {
    method: 'POST',
    body: { persona },
  });
  const session = (json.session ?? {}) as Record<string, unknown>;
  const token = (session.accessToken ?? json.accessToken ?? json.token) as unknown;
  assert(typeof token === 'string' && token.length > 0, `missing token for ${persona}`);
  return token;
}

async function main() {
  console.log(`unified-notification-dev-e2e API=${API}`);
  const a = await mockSignIn('DEV_A');
  const prefs = await request('/me/notification-preference', { token: a });
  assert(prefs.joinCreatedEnabled === true, 'default joinCreatedEnabled');
  assert(prefs.screenRadiusMode === 'KM_15', 'default screen radius 15km');
  assert(prefs.fieldRegionMode === 'AUTO', 'default field AUTO');

  const saved = await request('/me/notification-preference', {
    method: 'PATCH',
    token: a,
    body: { screenRadiusMode: 'KM_10', fieldRegionMode: 'CUSTOM' },
  });
  assert(saved.screenRadiusMode === 'KM_10', 'screen radius persisted');
  assert(saved.fieldRegionMode === 'CUSTOM', 'field CUSTOM persisted');

  const reset = await request('/me/notification-preference', {
    method: 'PATCH',
    token: a,
    body: { fieldRegionsResetToAuto: true },
  });
  assert(reset.fieldRegionMode === 'AUTO', 'reset to AUTO');

  const rejected = await fetch(`${API}/me/notification-preference`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${a}` },
    body: JSON.stringify({ userId: '00000000-0000-4000-8000-000000000099', pushEnabled: true }),
  });
  assert(rejected.status >= 400, 'settings body must reject arbitrary userId');

  const inbox = await request('/me/notifications', { token: a });
  assert(Array.isArray(inbox.items), 'inbox list');
  assert(typeof inbox.unreadCount === 'number', 'unread count');

  console.log('unified-notification-dev-e2e OK');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
