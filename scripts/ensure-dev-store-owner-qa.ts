/**
 * Development-only fixture: ensure DEV_A has one ACTIVE store ownership.
 * Tag: [QA-JOIN-CREATE-STORE]
 *
 * Uses public Development API (no Production DB). Idempotent.
 *
 *   JJOIN_API_BASE=https://api-development-e387.up.railway.app \
 *     pnpm exec tsx scripts/ensure-dev-store-owner-qa.ts
 */
const TAG = '[QA-JOIN-CREATE-STORE]';
const API = process.env.JJOIN_API_BASE ?? 'https://api-development-e387.up.railway.app';

async function req(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function signIn(persona: string): Promise<string> {
  const { status, json } = await req('POST', '/auth/social/mock-sign-in', undefined, {
    provider: 'KAKAO',
    persona,
  });
  if (status >= 400) {
    throw new Error(`${TAG} mock-sign-in ${persona} failed ${status}`);
  }
  const token = (json as { session?: { accessToken?: string } }).session?.accessToken;
  if (!token) throw new Error(`${TAG} missing token for ${persona}`);
  return token;
}

async function main() {
  const health = await req('GET', '/health');
  const healthJson = health.json as { appVariant?: string };
  if (healthJson.appVariant === 'production') {
    throw new Error(`${TAG} refused: Production API`);
  }
  if (healthJson.appVariant !== 'development') {
    throw new Error(`${TAG} refused: appVariant=${String(healthJson.appVariant)}`);
  }

  const ownerToken = await signIn('DEV_A');
  const existing = await req('GET', '/my-stores?includeWallet=1', ownerToken);
  const stores = Array.isArray(existing.json) ? existing.json : [];
  if (stores.length > 0) {
    const first = stores[0] as { id: string; facilityName?: string; walletAvailable?: string };
    console.log(`${TAG} already has store`, first.id, first.facilityName, 'avail', first.walletAvailable);
    return;
  }

  const search = await req('GET', '/golf-facilities/search?q=screen&limit=5', ownerToken);
  const items =
    (search.json as { items?: Array<{ id: string; coordinateStatus?: string }> }).items ?? [];
  const facility = items.find((f) => f.coordinateStatus === 'VALID') ?? items[0];
  if (!facility) throw new Error(`${TAG} no golf facility for fixture`);

  const created = await req('POST', '/store-verifications', ownerToken, {
    golfFacilityId: facility.id,
    applicantName: 'QA Store Owner',
    applicantPhone: '010-1234-5678',
    relation: 'OWNER',
    memo: TAG,
  });
  if (created.status >= 400) {
    throw new Error(`${TAG} verification create failed ${created.status} ${JSON.stringify(created.json)}`);
  }
  const requestId = (created.json as { id: string }).id;
  const adminToken = await signIn('DEV_ADMIN');
  const approved = await req(
    'POST',
    `/admin/store-verifications/${requestId}/approve`,
    adminToken,
  );
  if (approved.status >= 400) {
    throw new Error(`${TAG} approve failed ${approved.status} ${JSON.stringify(approved.json)}`);
  }
  const after = await req('GET', '/my-stores?includeWallet=1', ownerToken);
  console.log(`${TAG} store ready`, JSON.stringify(after.json));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
