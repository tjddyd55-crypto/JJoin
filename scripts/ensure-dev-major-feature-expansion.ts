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
  { name: '강남 스크린 라운지', sido: '서울특별시', sigungu: '강남구', brand: 'GOLFZON' as const, blurb: '야간 라운딩 맛집' },
  { name: '분당 카카오VX 스튜디오', sido: '경기도', sigungu: '성남시', brand: 'KAKAO_VX' as const, blurb: '조용한 연습 공간' },
  { name: '수원 SG 파크', sido: '경기도', sigungu: '수원시', brand: 'SG_GOLF' as const, blurb: '가족 라운드 추천' },
  { name: '마포 미드나잇 스크린', sido: '서울특별시', sigungu: '마포구', brand: 'OTHER' as const, other: '자체 시뮬레이터', blurb: '심야 오픈' },
  { name: '송파 골프존 클럽', sido: '서울특별시', sigungu: '송파구', brand: 'GOLFZON' as const, blurb: '주차·샤워 완비' },
];

const BANNERS = [
  { title: '오늘 맞는 조인 찾기', subtitle: '나와 잘 맞는 라운딩', href: '/(tabs)/joins', sortOrder: 1 },
  { title: '스크린 매장 둘러보기', subtitle: '검증된 매장에서 조인 만들기', href: '/stores', sortOrder: 2 },
  { title: '출석하고 코인 받기', subtitle: '하루 한 번 출석 보상', href: '/my/rewards', sortOrder: 3 },
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
    throw new Error(TAG + ' production_forbidden railwayEnv=' + railwayEnv + ' appVariant=' + appVariant);
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
          vibe: '밝고 편한 분위기',
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
