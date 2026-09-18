/**
 * DEV-only fixtures for major feature expansion.
 * Tag: [QA-MAJOR-FEATURE-EXPANSION]
 *
 * Creates ~5 public screen-store profiles + 3 home banner placeholders.
 * Never run against Production.
 *
 * Usage:
 *   railway run -s api -e development -- pnpm exec tsx scripts/ensure-dev-major-feature-expansion.ts
 */
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const TAG = '[QA-MAJOR-FEATURE-EXPANSION]';
const FIXTURE_PREFIX = 'qa-expansion-store-';

const STORES = [
  { name: '媛뺣궓 ?ㅽ겕由??쇱슫吏', sido: '?쒖슱?밸퀎??, sigungu: '媛뺣궓援?, brand: 'GOLFZON' as const, blurb: '?쇨컙 ?쇱슫??留쏆쭛' },
  { name: '遺꾨떦 移댁뭅?짿X ?ㅽ뒠?붿삤', sido: '寃쎄린??, sigungu: '?깅궓??, brand: 'KAKAO_VX' as const, blurb: '議곗슜???곗뒿 怨듦컙' },
  { name: '?섏썝 SG ?뚰겕', sido: '寃쎄린??, sigungu: '?섏썝??, brand: 'SG_GOLF' as const, blurb: '媛議??쇱슫??異붿쿇' },
  { name: '留덊룷 誘몃뱶?섏엲 ?ㅽ겕由?, sido: '?쒖슱?밸퀎??, sigungu: '留덊룷援?, brand: 'OTHER' as const, other: '?먯껜 ?쒕??덉씠??, blurb: '?ъ빞 ?ㅽ뵂' },
  { name: '?≫뙆 怨⑦봽議??대읇', sido: '?쒖슱?밸퀎??, sigungu: '?≫뙆援?, brand: 'GOLFZON' as const, blurb: '二쇱감쨌?ㅼ썙 ?꾨퉬' },
];

const BANNERS = [
  { title: '?ㅻ뒛 留욌뒗 議곗씤 李얘린', subtitle: '?섏? ??留욌뒗 ?쇱슫??, href: '/(tabs)/joins', sortOrder: 1 },
  { title: '?ㅽ겕由?留ㅼ옣 ?섎윭蹂닿린', subtitle: '寃利앸맂 留ㅼ옣?먯꽌 議곗씤 留뚮뱾湲?, href: '/stores', sortOrder: 2 },
  { title: '異쒖꽍?섍퀬 肄붿씤 諛쏄린', subtitle: '?섎（ ??踰?異쒖꽍 蹂댁긽', href: '/my/rewards', sortOrder: 3 },
];

function assertDevOnly() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) throw new Error('DATABASE_URL required');
  const railwayEnv = (process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.RAILWAY_ENVIRONMENT ?? '').toLowerCase();
  const appVariant = (process.env.JJOIN_APP_VARIANT ?? process.env.APP_ENV ?? '').toLowerCase();
  const isDev =
    railwayEnv === 'development' ||
    appVariant === 'development' ||
    appVariant === 'dev';
  // NODE_ENV is often "production" on Railway even for development — do not use it as the gate.
  const looksProdUrl =
    /production|prod-/i.test(url) ||
    /api-production/i.test(url) ||
    url.includes('postgres-production');
  if (!isDev || looksProdUrl || railwayEnv === 'production' || appVariant === 'production') {
    throw new Error(`${TAG} production_forbidden railwayEnv=${railwayEnv} appVariant=${appVariant}`);
  }
}


async function main() {
  assertDevOnly();
  const prisma = new PrismaClient();
  try {
    const sport = await prisma.sport.findFirst();
    if (!sport) throw new Error(`${TAG} sport missing`);
    const owner =
      (await prisma.user.findFirst({
        where: { socialAccounts: { some: { providerSubject: 'dev-persona-a' } } },
      })) ?? (await prisma.user.findFirst());
    if (!owner) throw new Error(`${TAG} need a DEV user`);

    for (const [index, store] of STORES.entries()) {
      const key = `${FIXTURE_PREFIX}${index}`;
      let facility = await prisma.golfFacility.findFirst({
        where: { governmentSourceKey: { startsWith: key } },
      });
      if (!facility) {
        facility = await prisma.golfFacility.create({
          data: {
            source: 'MANUAL',
            governmentSourceKey: `${key}-${randomUUID()}`,
            managementNo: `QA-EXP-${index}-${Date.now()}`,
            localGovernmentCode: '11140',
            sourceName: `${TAG} ${store.name}`,
            displayName: store.name,
            normalizedName: store.name.toLowerCase(),
            facilityType: 'SCREEN_GOLF',
            latitude: 37.5 + index * 0.01,
            longitude: 127.0 + index * 0.01,
            coordinateStatus: 'VALID',
            coordinateSource: 'MANUAL',
            isActive: true,
            isScreenJoinEligible: true,
            sido: store.sido,
            sigungu: store.sigungu,
            roadAddress: `${store.sido} ${store.sigungu} QA ${index}`,
          },
        });
      }

      let venue = await prisma.venue.findFirst({
        where: { golfFacilityId: facility.id },
      });
      if (!venue) {
        venue = await prisma.venue.create({
          data: {
            sportId: sport.id,
            provider: 'CUSTOM',
            providerPlaceId: `${key}-venue`,
            name: store.name,
            address: facility.roadAddress,
            region: `${store.sido} ${store.sigungu}`,
            latitude: facility.latitude ?? 37.5,
            longitude: facility.longitude ?? 127,
            golfFacilityId: facility.id,
          },
        });
      }

      const ownership = await prisma.storeOwnership.upsert({
        where: { userId_golfFacilityId: { userId: owner.id, golfFacilityId: facility.id } },
        create: {
          userId: owner.id,
          golfFacilityId: facility.id,
          venueId: venue.id,
          status: 'ACTIVE',
        },
        update: { status: 'ACTIVE', venueId: venue.id },
      });

      await prisma.storeProfile.upsert({
        where: { ownershipId: ownership.id },
        create: {
          id: randomUUID(),
          ownershipId: ownership.id,
          intro: store.blurb,
          vibe: '諛앷퀬 ?명븳 遺꾩쐞湲?,
          amenities: ['PARKING', 'LOUNGE'],
          screenBrand: store.brand,
          screenBrandOther: 'other' in store ? store.other : null,
          visibility: 'PUBLIC',
        },
        update: {
          intro: store.blurb,
          screenBrand: store.brand,
          screenBrandOther: 'other' in store ? store.other : null,
          visibility: 'PUBLIC',
        },
      });
    }

    for (const banner of BANNERS) {
      const existing = await prisma.homeBanner.findFirst({
        where: { title: banner.title },
      });
      if (existing) {
        await prisma.homeBanner.update({
          where: { id: existing.id },
          data: { ...banner, active: true },
        });
      } else {
        await prisma.homeBanner.create({
          data: { id: randomUUID(), ...banner, active: true },
        });
      }
    }

    console.log(`${TAG} upserted ${STORES.length} public store profiles and ${BANNERS.length} home banners`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
