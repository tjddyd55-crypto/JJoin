/**
 * Development-only concurrent join-create idempotency E2E.
 * Never run against Production.
 *
 *   JJOIN_API_BASE=https://api-development-e387.up.railway.app \
 *     pnpm exec tsx scripts/join-create-idempotency-concurrency-dev-e2e.ts
 */
const TAG = '[QA-JOIN-CREATE-IDEMPOTENCY]';
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
    throw new Error(`${TAG} mock-sign-in ${persona} failed ${status} ${JSON.stringify(json)}`);
  }
  const token = (json as { session?: { accessToken?: string } }).session?.accessToken;
  if (!token) throw new Error(`${TAG} missing token for ${persona}`);
  return token;
}

function joinIdOf(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const rec = json as { joinId?: unknown; id?: unknown };
  if (typeof rec.joinId === 'string') return rec.joinId;
  if (typeof rec.id === 'string') return rec.id;
  return null;
}

function futureIso(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 3600_000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

async function main() {
  const health = await req('GET', '/health');
  const healthJson = health.json as { appVariant?: string; railwayEnvironment?: string };
  if (healthJson.appVariant === 'production' || healthJson.railwayEnvironment === 'production') {
    throw new Error(`${TAG} refused: Production API`);
  }
  if (healthJson.appVariant !== 'development') {
    throw new Error(`${TAG} refused: appVariant=${String(healthJson.appVariant)}`);
  }

  const ownerToken = await signIn('DEV_A');
  const storesRes = await req('GET', '/my-stores?includeWallet=1', ownerToken);
  const stores = Array.isArray(storesRes.json) ? storesRes.json : [];
  const store = stores[0] as { id?: string } | undefined;
  if (!store?.id) throw new Error(`${TAG} DEV_A has no store. Run ensure-dev-store-owner-qa.ts`);

  const startAt = futureIso(6);
  const recruitClosesAt = futureIso(3);
  const zeroKey = `${TAG}-zero-${Date.now()}`;
  const zeroBody = {
    storeOwnershipId: store.id,
    startAt,
    recruitClosesAt,
    targetMaleCount: 1,
    targetFemaleCount: 2,
    minimumPlayers: 3,
    matchingRewardTarget: 'FEMALE',
    rewardPerParticipant: '0',
    title: `${TAG} reward0`,
    idempotencyKey: zeroKey,
  };

  const zeroHits = await Promise.all(
    [0, 1, 2, 3].map(() => req('POST', '/store-joins', ownerToken, zeroBody)),
  );
  const zeroIds = zeroHits.map((h) => {
    if (h.status !== 201 && h.status !== 200) {
      throw new Error(`${TAG} reward0 concurrent failed ${h.status} ${JSON.stringify(h.json)}`);
    }
    const id = joinIdOf(h.json);
    if (!id) throw new Error(`${TAG} reward0 missing joinId ${JSON.stringify(h.json)}`);
    return id;
  });
  if (new Set(zeroIds).size !== 1) {
    throw new Error(`${TAG} reward0 expected one joinId, got ${zeroIds.join(',')}`);
  }

  const rewardKey = `${TAG}-reward-${Date.now()}`;
  const rewardBody = { ...zeroBody, rewardPerParticipant: '10', title: `${TAG} reward10`, idempotencyKey: rewardKey };
  const walletBefore = await req('GET', '/wallet/me', ownerToken);
  const rewardHits = await Promise.all(
    [0, 1, 2].map(() => req('POST', '/store-joins', ownerToken, rewardBody)),
  );
  const rewardIds = rewardHits.map((h) => {
    if (h.status !== 201 && h.status !== 200) {
      throw new Error(`${TAG} reward>0 concurrent failed ${h.status} ${JSON.stringify(h.json)}`);
    }
    const id = joinIdOf(h.json);
    if (!id) throw new Error(`${TAG} reward>0 missing joinId`);
    return id;
  });
  if (new Set(rewardIds).size !== 1) {
    throw new Error(`${TAG} reward>0 expected one joinId, got ${rewardIds.join(',')}`);
  }

  const otherToken = await signIn('DEV_B');
  const otherStores = await req('GET', '/my-stores', otherToken);
  const otherList = Array.isArray(otherStores.json) ? otherStores.json : [];
  if (otherList.length > 0) {
    const otherStore = otherList[0] as { id: string };
    const crossKey = zeroKey;
    const otherHit = await req('POST', '/store-joins', otherToken, {
      ...zeroBody,
      storeOwnershipId: otherStore.id,
      title: `${TAG} other-host`,
      idempotencyKey: crossKey,
    });
    const otherId = joinIdOf(otherHit.json);
    if ((otherHit.status === 200 || otherHit.status === 201) && otherId && otherId === zeroIds[0]) {
      throw new Error(`${TAG} different hosts collided on the same client key`);
    }
  }

  console.log(JSON.stringify({
    tag: TAG,
    reward0JoinId: zeroIds[0],
    reward0Responses: zeroIds.length,
    rewardHoldJoinId: rewardIds[0],
    rewardHoldResponses: rewardIds.length,
    walletBefore,
    ok: true,
  }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
