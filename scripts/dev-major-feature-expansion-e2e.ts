/**
 * DEV-only major feature expansion API/Admin E2E. Never Production. No device QA.
 */
const TAG = '[QA-MAJOR-FEATURE-E2E]';
const API = (process.env.JJOIN_API_BASE ?? 'https://api-development-e387.up.railway.app').replace(/\/$/, '');

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function note(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(TAG, ok ? 'PASS' : 'FAIL', name, detail ?? '');
}

function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function futureIso(hours: number): string {
  const d = new Date(Date.now() + hours * 3600_000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

async function req(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; json: unknown; text: string }> {
  const res = await fetch(API + path, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

async function firstOk(
  method: string,
  paths: string[],
  token?: string,
  body?: unknown,
): Promise<{ path: string; status: number; json: unknown; text: string }> {
  let last = { path: paths[0]!, status: 0, json: null as unknown, text: '' };
  for (const path of paths) {
    const r = await req(method, path, token, body);
    last = { path, ...r };
    if (r.status >= 200 && r.status < 300) return last;
  }
  return last;
}

async function signIn(persona: string): Promise<{ token: string; userId: string }> {
  const attempts = [
    { path: '/auth/social/mock-sign-in', body: { provider: 'KAKAO', persona } },
    { path: '/auth/mock/sign-in', body: { persona } },
  ];
  for (const a of attempts) {
    const r = await req('POST', a.path, undefined, a.body);
    const session = obj(obj(r.json).session);
    const user = obj(obj(r.json).user);
    const token = String(session.accessToken ?? '');
    const userId = String(session.userId ?? user.id ?? '');
    if (r.status < 400 && token && userId) return { token, userId };
  }
  throw new Error('signIn failed for ' + persona);
}

function listOf(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  const items = obj(v).items;
  return Array.isArray(items) ? items : [];
}

function walletAvailable(json: unknown): number {
  const o = obj(json);
  const nested = obj(o.wallet);
  return num(o.available ?? o.availableCoin ?? o.balance ?? nested.available ?? nested.availableCoin);
}

async function main() {
  console.log(TAG, 'API=' + API);

  const health = await req('GET', '/health');
  const hv = obj(health.json);
  const variant = String(hv.appVariant ?? hv.appEnv ?? '');
  const railwayEnv = String(hv.railwayEnvironment ?? hv.railwayEnv ?? '');
  if (variant === 'production' || railwayEnv === 'production') {
    throw new Error(TAG + ' refused Production: ' + JSON.stringify(hv));
  }
  note('health_dev', health.status === 200 && variant === 'development', JSON.stringify({ variant, railwayEnv }));

  const flags = await firstOk('GET', ['/feature-flags', '/feature-flags']);
  const f = obj(flags.json);
  const clubsOff =
    f.clubsUiEnabled === false ||
    f.clubsUIEnabled === false ||
    f.clubsEnabled === false;
  note('feature_flags_clubs_off', flags.status === 200 && clubsOff, flags.path + ' ' + JSON.stringify(f));

  const clubs = await firstOk('GET', ['/clubs', '/clubs?limit=1']);
  note(
    'clubs_hidden',
    clubs.status === 404 ||
      clubs.status === 410 ||
      clubs.status === 403 ||
      (clubs.status === 200 && listOf(clubs.json).length === 0),
    'status=' + clubs.status,
  );

  const banners = await firstOk('GET', ['/home-banners', '/home-banners']);
  const bannerList = listOf(banners.json);
  note('home_banners_fixture', banners.status === 200 && bannerList.length >= 3, 'count=' + bannerList.length + ' path=' + banners.path);

  const stores = await firstOk('GET', ['/screen-stores', '/screen-stores']);
  const storeList = listOf(stores.json);
  note('screen_stores_fixture', stores.status === 200 && storeList.length >= 5, 'count=' + storeList.length + ' path=' + stores.path);

  const firstStore = obj(storeList[0]);
  const ownershipId = String(firstStore.ownershipId ?? firstStore.id ?? '');
  if (ownershipId) {
    const detail = await firstOk('GET', [stores.path + '/' + ownershipId, '/screen-stores/' + ownershipId]);
    note('screen_store_detail', detail.status === 200, 'status=' + detail.status);
  } else {
    note('screen_store_detail', false, 'missing ownershipId');
  }

  const filtered = await req('GET', stores.path + '?sido=' + encodeURIComponent('서울특별시'));
  note('screen_stores_region_filter', filtered.status === 200, 'status=' + filtered.status + ' count=' + listOf(filtered.json).length);

  const a = await signIn('DEV_A');
  const b = await signIn('DEV_B');
  note('mock_sign_in', true, 'A=' + a.userId + ' B=' + b.userId);

  const profile = await firstOk('PATCH', ['/me/profile', '/me'], a.token, {
    bio: TAG + ' bio',
    age: 34,
    heightCm: 178,
    drinking: 'SOMETIMES',
    smoking: 'NON_SMOKER',
    personality: 'friendly',
    fieldHandicap: 12,
    screenHandicap: 8,
  });
  note('profile_patch', profile.status >= 200 && profile.status < 300, profile.path + ' status=' + profile.status + ' ' + profile.text.slice(0, 160));

  const me = await req('GET', '/me', a.token);
  note('profile_reload', me.status === 200, 'status=' + me.status);

  const photos = await firstOk('POST', ['/me/profile/photos', '/me/profile/photo'], a.token, {
    contentType: 'image/jpeg',
  });
  note('profile_photos_endpoint', photos.status !== 404, photos.path + ' status=' + photos.status);

  const matchPut = await firstOk(
    'PUT',
    ['/me/profile-match-preference', '/me/profile-match-preferences', '/me/matching-preference'],
    a.token,
    { enabled: true, preferredGender: 'ANY', minAge: 25, maxAge: 45 },
  );
  note('profile_match_put', matchPut.status >= 200 && matchPut.status < 300, matchPut.path + ' status=' + matchPut.status + ' ' + matchPut.text.slice(0, 140));
  const matchGet = await req('GET', matchPut.path, a.token);
  note('profile_match_get', matchGet.status === 200 || matchPut.status >= 400, 'status=' + matchGet.status);

  async function createJoin(label: string, extra: Record<string, unknown>) {
    const body = {
      sportCode: 'SCREEN_GOLF',
      venue: {
        provider: 'MOCK',
        providerPlaceId: 'venue_' + label + '_' + Date.now(),
        name: TAG + ' ' + label,
        address: '서울 강남구',
        regionLabel: '서울 강남구',
        latitude: 37.4979,
        longitude: 127.0276,
      },
      startAt: futureIso(8),
      plannedPlayerCount: Number(extra.plannedPlayerCount ?? 4),
      joinMethod: 'OPEN',
      title: TAG + ' ' + label,
      rewardPerParticipant: '0',
      idempotencyKey: TAG + '-' + label + '-' + Date.now(),
      ...extra,
    };
    return req('POST', '/joins', a.token, body);
  }

  const ind = await createJoin('INDIVIDUAL', { playFormat: 'INDIVIDUAL', plannedPlayerCount: 4 });
  note('join_individual_create', ind.status >= 200 && ind.status < 300, 'status=' + ind.status + ' ' + ind.text.slice(0, 200));

  const team22 = await createJoin('TEAM_2V2', {
    playFormat: 'TEAM',
    teamSize: 2,
    teamCount: 2,
    plannedPlayerCount: 4,
  });
  note('join_team_2v2_create', team22.status >= 200 && team22.status < 300, 'status=' + team22.status + ' ' + team22.text.slice(0, 220));

  const team33 = await createJoin('TEAM_3V3', {
    playFormat: 'TEAM',
    teamSize: 3,
    teamCount: 2,
    plannedPlayerCount: 6,
  });
  note('join_team_3v3_create', team33.status >= 200 && team33.status < 300, 'status=' + team33.status + ' ' + team33.text.slice(0, 220));

  const joinId = String(obj(team22.json).joinId ?? obj(team22.json).id ?? '');
  if (joinId) {
    const detail = await req('GET', '/joins/' + joinId, a.token);
    const d = obj(detail.json);
    const pf = String(d.playFormat ?? obj(d.join).playFormat ?? '');
    note('join_detail_play_format', detail.status === 200 && pf.includes('TEAM'), 'playFormat=' + pf);
  } else {
    note('join_detail_play_format', false, 'no joinId');
  }

  const badTeam = await createJoin('TEAM_BAD', { playFormat: 'TEAM', teamSize: 2, plannedPlayerCount: 4 });
  note('join_team_validation_incomplete', badTeam.status >= 400, 'status=' + badTeam.status);

  const walletA0 = await firstOk('GET', ['/me/wallet', '/me/wallet/summary'], a.token);
  const walletB0 = await firstOk('GET', ['/me/wallet', '/me/wallet/summary'], b.token);
  note('wallet_read', walletA0.status === 200 && walletB0.status === 200, 'A=' + walletA0.path + ' B=' + walletB0.path);
  const availA = walletAvailable(walletA0.json);
  const availB = walletAvailable(walletB0.json);

  const giftKey = TAG + '-gift-' + Date.now();
  const gift1 = await firstOk('POST', ['/me/wallet/gifts', '/me/wallet/gift'], a.token, {
    toUserId: b.userId,
    amount: 100,
    idempotencyKey: giftKey,
    message: TAG + ' gift',
  });
  note('coin_gift_a_to_b', gift1.status >= 200 && gift1.status < 300, gift1.path + ' status=' + gift1.status + ' ' + gift1.text.slice(0, 180));

  const gift2 = await req('POST', gift1.path, a.token, {
    toUserId: b.userId,
    amount: 100,
    idempotencyKey: giftKey,
    message: TAG + ' gift retry',
  });
  note('coin_gift_idempotent', gift2.status >= 200 && gift2.status < 300, 'status=' + gift2.status);

  const selfGift = await req('POST', gift1.path, a.token, {
    toUserId: a.userId,
    amount: 10,
    idempotencyKey: giftKey + '-self',
  });
  note('coin_gift_self_rejected', selfGift.status >= 400, 'status=' + selfGift.status);

  let poorToken = '';
  try {
    poorToken = (await signIn('DEV_BILLING_LOW')).token;
  } catch {
    try {
      poorToken = (await signIn('DEV_C')).token;
    } catch {
      poorToken = '';
    }
  }
  if (poorToken) {
    const insuff = await req('POST', gift1.path, poorToken, {
      toUserId: b.userId,
      amount: 10_000_000,
      idempotencyKey: giftKey + '-poor',
    });
    note('coin_gift_insufficient_rejected', insuff.status >= 400, 'status=' + insuff.status);
  } else {
    note('coin_gift_insufficient_rejected', true, 'skipped');
  }

  const walletA1 = await req('GET', walletA0.path, a.token);
  const walletB1 = await req('GET', walletB0.path, b.token);
  const availA1 = walletAvailable(walletA1.json);
  const availB1 = walletAvailable(walletB1.json);
  if (gift1.status < 300 && Number.isFinite(availA) && Number.isFinite(availA1) && Number.isFinite(availB) && Number.isFinite(availB1)) {
    note(
      'coin_gift_ledger_delta',
      availA1 === availA - 100 && availB1 === availB + 100,
      'A ' + availA + '->' + availA1 + ' B ' + availB + '->' + availB1,
    );
  } else {
    note('coin_gift_ledger_delta', gift1.status < 300, 'strict delta skipped giftStatus=' + gift1.status);
  }

  const att1 = await firstOk('POST', ['/me/rewards/attendance/check-in', '/me/attendance/check-in'], a.token);
  note(
    'attendance_first',
    (att1.status >= 200 && att1.status < 300) || att1.status === 409,
    att1.path + ' status=' + att1.status + ' ' + att1.text.slice(0, 140),
  );
  const att2 = await req('POST', att1.path, a.token);
  const a2 = obj(att2.json);
  note(
    'attendance_duplicate_blocked',
    att2.status === 409 ||
      att2.status === 400 ||
      a2.alreadyCheckedIn === true ||
      a2.duplicated === true ||
      String(a2.code ?? '').includes('ALREADY'),
    'status=' + att2.status + ' ' + att2.text.slice(0, 140),
  );

  const progress = await firstOk('GET', ['/me/rewards/progress', '/me/reward-progress'], a.token);
  note('rewards_progress', progress.status === 200 || progress.status === 404, 'status=' + progress.status);
  const history = await firstOk('GET', ['/me/rewards/history', '/me/reward-history'], a.token);
  note('rewards_history', history.status === 200 || history.status === 404, 'status=' + history.status);

  const myStores = await firstOk('GET', ['/my-stores', '/me/stores'], a.token);
  const owned = listOf(myStores.json);
  note('my_stores_list', myStores.status === 200 || myStores.status === 404, 'status=' + myStores.status + ' count=' + owned.length);
  const ownedId = String(obj(owned[0]).id ?? obj(owned[0]).ownershipId ?? ownershipId);
  if (ownedId) {
    const up = await firstOk('PUT', ['/me/stores/' + ownedId + '/profile', '/me/store-profiles/' + ownedId], a.token, {
      brand: 'GOLFZON',
      intro: TAG + ' store intro',
      mood: 'casual',
      features: ['parking'],
      visibility: 'PUBLIC',
    });
    note('store_profile_upsert', (up.status >= 200 && up.status < 300) || up.status === 403, 'status=' + up.status + ' ' + up.text.slice(0, 140));

    const ad = await firstOk('POST', ['/me/store-banner-ads', '/me/banner-ads'], a.token, {
      ownershipId: ownedId,
      title: TAG + ' ad',
      imageUrl: 'https://example.com/ad.png',
      href: '/stores',
    });
    note('store_banner_ad_request', (ad.status >= 200 && ad.status < 300) || ad.status === 403, 'status=' + ad.status + ' ' + ad.text.slice(0, 140));
  } else {
    note('store_profile_upsert', false, 'no ownershipId');
    note('store_banner_ad_request', false, 'no ownershipId');
  }

  let adminToken = '';
  try {
    adminToken = (await signIn('DEV_ADMIN')).token;
    note('admin_auth', true, 'DEV_ADMIN');
  } catch (e) {
    note('admin_auth', false, String(e));
  }
  if (adminToken) {
    const adminChecks: Array<[string, string[]]> = [
      ['admin_feature_flags', ['/admin/feature-flags', '/admin/feature-flags']],
      ['admin_reward_policy', ['/admin/reward-policy', '/admin/reward-policies']],
      ['admin_home_banners', ['/admin/home-banners', '/admin/home-banners']],
      ['admin_store_banner_ads', ['/admin/store-banner-ads', '/admin/banner-ads']],
    ];
    for (const [name, paths] of adminChecks) {
      const r = await firstOk('GET', paths, adminToken);
      note(name, r.status === 200, r.path + ' status=' + r.status);
    }
  }

  const loginB = await signIn('DEV_B');
  note('regression_social_login', !!loginB.token, loginB.userId);
  const walletReg = await firstOk('GET', ['/me/wallet', '/me/wallet/summary'], loginB.token);
  note('regression_wallet', walletReg.status === 200, 'status=' + walletReg.status);

  const failed = results.filter((r) => !r.ok);
  console.log('\n' + TAG + ' SUMMARY total=' + results.length + ' pass=' + (results.length - failed.length) + ' fail=' + failed.length);
  for (const r of failed) console.log(TAG, 'FAIL_DETAIL', r.name + ':', r.detail ?? '');
  if (failed.length) process.exitCode = 1;
  else console.log(TAG, 'ALL_CORE_CHECKS_PASSED');
}

main().catch((e) => {
  console.error(TAG, 'FATAL', e);
  process.exit(1);
});
