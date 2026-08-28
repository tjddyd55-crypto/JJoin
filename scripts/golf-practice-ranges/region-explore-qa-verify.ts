/**
 * Verify region explore QA seed + facilities API behavior.
 *
 *   pnpm exec tsx scripts/golf-practice-ranges/region-explore-qa-verify.ts
 */
const API = process.env.API_BASE ?? 'http://127.0.0.1:3000';

async function signIn() {
  const r = await fetch(`${API}/auth/social/mock-sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'KAKAO', persona: 'DEV_A' }),
  });
  const b = (await r.json()) as { session: { accessToken: string } };
  return b.session.accessToken;
}

async function get<T>(token: string, path: string): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

async function main() {
  const token = await signIn();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

  const top = await get<{ items: Array<{ label: string; count: number }> }>(
    token,
    `/joins/discover/region-summary?date=${today}&joinability=JOINABLE`,
  );
  const seoul = top.items.find((i) => i.label === '서울')?.count ?? 0;
  const gyeonggi = top.items.find((i) => i.label === '경기')?.count ?? 0;
  const incheon = top.items.find((i) => i.label === '인천')?.count ?? 0;

  const seoulGu = await get<{ items: Array<{ sigungu: string; count: number }> }>(
    token,
    `/joins/discover/region-summary?date=${today}&joinability=JOINABLE&sido=${encodeURIComponent('서울특별시')}`,
  );
  const gangnam = seoulGu.items.find((i) => i.sigungu === '강남구')?.count ?? 0;

  const gangnamFacilities = await get<{ facilities: Array<{ joinCount: number }>; totalJoinCount: number }>(
    token,
    `/joins/discover/facilities?date=${today}&joinability=JOINABLE&regionMode=DISTRICT&sido=${encodeURIComponent('서울특별시')}&sigungu=${encodeURIComponent('강남구')}`,
  );

  const gyeonggiGu = await get<{ items: Array<{ sigungu: string; count: number; hasChildren: boolean }> }>(
    token,
    `/joins/discover/region-summary?date=${today}&joinability=JOINABLE&sido=${encodeURIComponent('경기도')}`,
  );
  const goyang = gyeonggiGu.items.find((i) => i.sigungu === '고양시');
  const ilsan = goyang
    ? await get<{ items: Array<{ sigungu: string; count: number }> }>(
        token,
        `/joins/discover/region-summary?date=${today}&joinability=JOINABLE&sido=${encodeURIComponent('경기도')}&sigungu=${encodeURIComponent('고양시')}`,
      )
    : null;
  const ilsanDong = ilsan?.items.find((i) => i.sigungu === '일산동구')?.count ?? 0;

  const ilsanFacilities = await get<{ facilities: unknown[]; totalJoinCount: number }>(
    token,
    `/joins/discover/facilities?date=${today}&joinability=JOINABLE&regionMode=DISTRICT&sido=${encodeURIComponent('경기도')}&sigungu=${encodeURIComponent('일산동구')}`,
  );

  const seoulLat = 37.5029114;
  const seoulLng = 127.0421712;
  const nearbyJoins = await get<{ facilities: Array<{ joinCount: number }>; totalJoinCount: number }>(
    token,
    `/joins/discover/facilities?date=${today}&joinability=JOINABLE&regionMode=NEARBY&lat=${seoulLat}&lng=${seoulLng}&radiusMeters=5000&sort=DISTANCE`,
  );
  const nearbyGolf = await get<{ items: Array<{ displayName: string }> }>(
    token,
    `/golf-facilities?north=${seoulLat + 0.05}&south=${seoulLat - 0.05}&east=${seoulLng + 0.05}&west=${seoulLng - 0.05}&regionMode=NEARBY&lat=${seoulLat}&lng=${seoulLng}&radiusMeters=5000`,
  );

  console.log(
    JSON.stringify(
      {
        date: today,
        counts: { seoul, gyeonggi, incheon, gangnam, ilsanDong },
        seoulDrillDown: {
          gangnamFacilities: gangnamFacilities.facilities.length,
          gangnamJoins: gangnamFacilities.totalJoinCount,
        },
        gyeonggiDrillDown: {
          goyangCount: goyang?.count ?? 0,
          ilsanDongCount: ilsanDong,
          ilsanFacilities: ilsanFacilities.facilities.length,
          ilsanJoins: ilsanFacilities.totalJoinCount,
        },
        nearby: {
          discoverFacilities: nearbyJoins.facilities.length,
          discoverJoins: nearbyJoins.totalJoinCount,
          golfFacilitiesRaw: nearbyGolf.items.length,
          joinableOnly: nearbyJoins.facilities.every((f) => f.joinCount > 0),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
