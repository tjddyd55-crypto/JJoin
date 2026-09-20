/**
 * Investor demo upserts. Idempotent on providerSubject / join client keys / banner titles.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import {
  IdentityStatus,
  JoinStatus,
  ParticipantRole,
  ParticipationStatus,
  PrismaClient,
  VenueType,
} from '@prisma/client';
import { DEFAULT_HOST_MILESTONES, DEFAULT_PARTICIPATION_MILESTONES } from '../../packages/domain/src/attendance-rewards.ts';
import { createJoinShareSlug } from '../../packages/domain/src/join-engagement.ts';
import { TERMS_VERSION } from '../../apps/api/src/auth/consent-policy.ts';
import { CoinLedgerService } from '../../apps/api/src/modules/wallet/coin-ledger.service.ts';
import type { PrismaService } from '../../apps/api/src/prisma/prisma.service.ts';
import { ensureFoundation } from '../../apps/api/src/foundation/ensure-foundation.ts';
import {
  DEMO_CLUB,
  DEMO_PERSONAS,
  DEMO_STORES,
  DEMO_BANNERS,
  DEMO_FIELD_COURSE_FALLBACKS,
  DEMO_FACILITY_KEY_PREFIX,
  DEMO_COURSE_EXTERNAL_PREFIX,
  DEMO_JOIN_TITLE_PREFIX,
  DEMO_VENUE_PLACE_PREFIX,
  type DemoPersonaSlug,
  type DemoPersonaSpec,
  demoAvatarUrl,
  demoBannerTitle,
  demoClubName,
  demoEmail,
  demoGalleryUrl,
  demoProviderSubject,
  pexelsImageUrl,
} from './investor-demo-catalog.ts';
import { listRecentKstDates, seedAttendanceHistory, seedReachedMilestones, todayKstDate } from './investor-demo-rewards.ts';

export type SeedSummary = {
  users: Array<{ slug: string; nickname: string; userId: string }>;
  stores: number;
  fieldVenues: number;
  joins: number;
  banners: number;
  clubs: number;
  conversations: number;
  attendanceCreated: number;
  milestonesCreated: number;
};

type SeedCtx = {
  prisma: PrismaClient;
  ledger: CoinLedgerService;
  sportId: string;
  coinAssetId: string;
  users: Map<DemoPersonaSlug, { id: string; spec: DemoPersonaSpec }>;
  storeVenues: Map<string, { venueId: string; facilityId: string; ownershipId: string }>;
  fieldVenues: string[];
};

export async function seedInvestorDemo(prisma: PrismaClient): Promise<SeedSummary> {
  const foundation = await ensureFoundation(prisma);
  const ledger = new CoinLedgerService(prisma as PrismaService);
  const ctx: SeedCtx = {
    prisma,
    ledger,
    sportId: foundation.sport.id,
    coinAssetId: foundation.coinAsset.id,
    users: new Map(),
    storeVenues: new Map(),
    fieldVenues: [],
  };
  await ensureFeatureFlags(prisma);
  await seedUsers(ctx);
  await seedStores(ctx);
  ctx.fieldVenues = await seedFieldVenues(ctx);
  const joins = await seedJoins(ctx);
  const banners = await seedBanners(prisma);
  const clubs = await seedClub(ctx);
  const conversations = await seedDirectMessages(ctx);
  const rewards = await seedRewards(ctx);
  return {
    users: [...ctx.users.values()].map((row) => ({
      slug: row.spec.slug,
      nickname: row.spec.nickname,
      userId: row.id,
    })),
    stores: ctx.storeVenues.size,
    fieldVenues: ctx.fieldVenues.length,
    joins,
    banners,
    clubs,
    conversations,
    attendanceCreated: rewards.attendanceCreated,
    milestonesCreated: rewards.milestonesCreated,
  };
}

async function ensureFeatureFlags(prisma: PrismaClient): Promise<void> {
  await prisma.featureFlagSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      homeBannersEnabled: true,
      attendanceRewardsEnabled: true,
      storeProfilesEnabled: true,
      clubsUiEnabled: true,
    },
    update: {
      homeBannersEnabled: true,
      attendanceRewardsEnabled: true,
      storeProfilesEnabled: true,
      clubsUiEnabled: true,
    },
  });
}

async function seedUsers(ctx: SeedCtx): Promise<void> {
  for (const spec of DEMO_PERSONAS) {
    const userId = await upsertDemoUser(ctx, spec);
    ctx.users.set(spec.slug, { id: userId, spec });
  }
}

async function upsertDemoUser(ctx: SeedCtx, spec: DemoPersonaSpec): Promise<string> {
  const subject = demoProviderSubject(spec.slug);
  const existing = await ctx.prisma.socialAccount.findUnique({
    where: { provider_providerSubject: { provider: 'KAKAO', providerSubject: subject } },
  });
  const userId = existing?.userId ?? randomUUID();
  if (!existing) {
    await ctx.prisma.user.create({
      data: {
        id: userId,
        status: 'ACTIVE',
        identityStatus: IdentityStatus.VERIFIED,
        countryCode: 'KR',
        locale: 'ko-KR',
        timezone: 'Asia/Seoul',
      },
    });
    await ctx.prisma.socialAccount.create({
      data: {
        userId,
        provider: 'KAKAO',
        providerSubject: subject,
        providerEmail: demoEmail(spec.slug),
      },
    });
  } else {
    await ctx.prisma.user.update({
      where: { id: userId },
      data: { identityStatus: IdentityStatus.VERIFIED, status: 'ACTIVE' },
    });
  }
  await upsertDemoProfile(ctx, userId, spec);
  return userId;
}

async function upsertDemoProfile(ctx: SeedCtx, userId: string, spec: DemoPersonaSpec): Promise<void> {
  const avatarId = await ensureAvatarAsset(ctx.prisma, userId, spec.slug);
  await ctx.prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      nickname: spec.nickname,
      avatarAssetId: avatarId,
      gender: spec.gender,
      ageBand: spec.ageBand,
      age: spec.age,
      heightCm: spec.heightCm,
      regionLabel: spec.regionLabel,
      regionCode: spec.regionCode,
      bio: spec.bio,
      drinking: 'SOMETIMES',
      smoking: 'NONE',
    },
    update: {
      nickname: spec.nickname,
      avatarAssetId: avatarId,
      gender: spec.gender,
      ageBand: spec.ageBand,
      bio: spec.bio,
      regionLabel: spec.regionLabel,
    },
  });
  await ctx.prisma.userSportProfile.upsert({
    where: { userId_sportId: { userId, sportId: ctx.sportId } },
    create: {
      userId,
      sportId: ctx.sportId,
      skillLevel: spec.skillLevel,
      screenHandicap: spec.screenHandicap,
      fieldHandicap: spec.fieldHandicap,
    },
    update: {
      skillLevel: spec.skillLevel,
      screenHandicap: spec.screenHandicap,
      fieldHandicap: spec.fieldHandicap,
    },
  });
  await replaceProfilePhotos(ctx.prisma, userId, spec.slug);
  await ensureRequiredConsents(ctx.prisma, userId);
}

async function ensureAvatarAsset(prisma: PrismaClient, userId: string, slug: DemoPersonaSlug): Promise<string> {
  const existing = await prisma.mediaAsset.findFirst({
    where: { ownerUserId: userId, kind: 'AVATAR' },
  });
  if (existing) {
    await prisma.mediaAsset.update({
      where: { id: existing.id },
      data: { storageKey: demoAvatarUrl(slug) },
    });
    return existing.id;
  }
  const created = await prisma.mediaAsset.create({
    data: {
      ownerUserId: userId,
      kind: 'AVATAR',
      storageKey: demoAvatarUrl(slug),
      mimeType: 'image/png',
    },
  });
  return created.id;
}

async function replaceProfilePhotos(prisma: PrismaClient, userId: string, slug: DemoPersonaSlug): Promise<void> {
  await prisma.userProfilePhoto.deleteMany({ where: { userId } });
  await prisma.userProfilePhoto.createMany({
    data: [
      { userId, objectKey: demoAvatarUrl(slug), sortOrder: 0, isPrimary: true },
      { userId, objectKey: demoGalleryUrl(slug, 1), sortOrder: 1, isPrimary: false },
    ],
  });
}

async function ensureRequiredConsents(prisma: PrismaClient, userId: string): Promise<void> {
  for (const type of ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'IDENTITY_NOTICE', 'LOCATION'] as const) {
    await prisma.userConsent.upsert({
      where: { userId_type_version: { userId, type, version: TERMS_VERSION } },
      create: { userId, type, version: TERMS_VERSION, agreed: true },
      update: { agreed: true },
    });
  }
}

async function seedStores(ctx: SeedCtx): Promise<void> {
  for (const store of DEMO_STORES) {
    const owner = mustUser(ctx, store.ownerSlug);
    const facilityKey = `${DEMO_FACILITY_KEY_PREFIX}${store.slug}`;
    let facility = await ctx.prisma.golfFacility.findFirst({
      where: { governmentSourceKey: facilityKey },
    });
    if (!facility) {
      facility = await ctx.prisma.golfFacility.create({
        data: {
          source: 'MANUAL',
          governmentSourceKey: facilityKey,
          managementNo: `INV-DEMO-${store.slug}`,
          localGovernmentCode: '11140',
          sourceName: store.name,
          displayName: store.name,
          normalizedName: store.name.toLowerCase(),
          facilityType: 'SCREEN_GOLF',
          latitude: store.lat,
          longitude: store.lng,
          coordinateStatus: 'VALID',
          coordinateSource: 'MANUAL',
          isActive: true,
          isScreenJoinEligible: true,
          hasScreenGolf: 'YES',
          screenStatus: 'CONFIRMED',
          sido: store.sido,
          sigungu: store.sigungu,
          roadAddress: `${store.sido} ${store.sigungu} ${store.name}`,
        },
      });
    }
    const venue = await ensureScreenVenue(ctx, facility.id, store.slug, store.name, store.lat, store.lng);
    const ownership = await ctx.prisma.storeOwnership.upsert({
      where: { userId_golfFacilityId: { userId: owner.id, golfFacilityId: facility.id } },
      create: { userId: owner.id, golfFacilityId: facility.id, venueId: venue.id, status: 'ACTIVE' },
      update: { status: 'ACTIVE', venueId: venue.id },
    });
    await upsertStoreProfile(ctx, ownership.id, store.intro, store.vibe, store.brand, store.brandOther, store.coverPexelsId);
    ctx.storeVenues.set(store.slug, {
      venueId: venue.id,
      facilityId: facility.id,
      ownershipId: ownership.id,
    });
  }
}

async function ensureScreenVenue(
  ctx: SeedCtx,
  facilityId: string,
  slug: string,
  name: string,
  lat: number,
  lng: number,
) {
  const placeId = `${DEMO_VENUE_PLACE_PREFIX}screen-${slug}`;
  const existing = await ctx.prisma.venue.findFirst({
    where: { OR: [{ golfFacilityId: facilityId }, { providerPlaceId: placeId }] },
  });
  if (existing) return existing;
  return ctx.prisma.venue.create({
    data: {
      sportId: ctx.sportId,
      provider: 'CUSTOM',
      providerPlaceId: placeId,
      name,
      address: name,
      latitude: lat,
      longitude: lng,
      venueType: VenueType.SCREEN,
      golfFacilityId: facilityId,
      region: name,
    },
  });
}

async function upsertStoreProfile(
  ctx: SeedCtx,
  ownershipId: string,
  intro: string,
  vibe: string,
  brand: 'GOLFZON' | 'KAKAO_VX' | 'SG_GOLF' | 'OTHER',
  brandOther: string | undefined,
  coverPexelsId: number,
): Promise<void> {
  const cover = pexelsImageUrl(coverPexelsId);
  const profile = await ctx.prisma.storeProfile.upsert({
    where: { ownershipId },
    create: {
      ownershipId,
      intro,
      vibe,
      amenities: ['PARKING', 'LOUNGE', 'SHOWER'],
      screenBrand: brand,
      screenBrandOther: brandOther ?? null,
      visibility: 'PUBLIC',
      coverObjectKey: cover,
      parkingAvailable: true,
      roomCount: 8,
    },
    update: {
      intro,
      vibe,
      screenBrand: brand,
      screenBrandOther: brandOther ?? null,
      visibility: 'PUBLIC',
      coverObjectKey: cover,
    },
  });
  await ctx.prisma.storeProfilePhoto.deleteMany({ where: { profileId: profile.id } });
  await ctx.prisma.storeProfilePhoto.create({
    data: { profileId: profile.id, objectKey: cover, sortOrder: 0 },
  });
  await ctx.prisma.storeOperatingHours.deleteMany({ where: { profileId: profile.id } });
  await ctx.prisma.storeOperatingHours.createMany({
    data: [
      { profileId: profile.id, dayGroup: 'WEEKDAY', startTime: '10:00', endTime: '24:00', sortOrder: 0 },
      { profileId: profile.id, dayGroup: 'WEEKEND', startTime: '09:00', endTime: '02:00', sortOrder: 1 },
    ],
  });
}

async function seedFieldVenues(ctx: SeedCtx): Promise<string[]> {
  const existing = await ctx.prisma.fieldGolfCourse.findMany({
    where: { isActive: true, latitude: { not: null }, sido: { not: null } },
    take: 6,
    orderBy: { name: 'asc' },
  });
  const venueIds: string[] = [];
  const courses = existing.length >= 2 ? existing.slice(0, 3) : await createFallbackCourses(ctx);
  for (const [index, course] of courses.entries()) {
    const venue = await ensureFieldVenue(ctx, course.id, course.name, index, Number(course.latitude ?? 37.2), Number(course.longitude ?? 127.1));
    venueIds.push(venue.id);
  }
  return venueIds;
}

async function createFallbackCourses(ctx: SeedCtx) {
  const created = [];
  for (const spec of DEMO_FIELD_COURSE_FALLBACKS) {
    const course = await ctx.prisma.fieldGolfCourse.upsert({
      where: {
        externalSource_externalId: {
          externalSource: 'INVESTOR_DEMO',
          externalId: `${DEMO_COURSE_EXTERNAL_PREFIX}${spec.slug}`,
        },
      },
      create: {
        externalSource: 'INVESTOR_DEMO',
        externalId: `${DEMO_COURSE_EXTERNAL_PREFIX}${spec.slug}`,
        name: spec.name,
        normalizedName: spec.name.toLowerCase(),
        address: spec.address,
        roadAddress: spec.address,
        sido: spec.sido,
        sigungu: spec.sigungu,
        latitude: spec.lat,
        longitude: spec.lng,
        holeCount: spec.holeCount,
        isActive: true,
        status: '영업',
      },
      update: { isActive: true, name: spec.name },
    });
    created.push(course);
  }
  return created;
}

async function ensureFieldVenue(
  ctx: SeedCtx,
  courseId: string,
  name: string,
  index: number,
  lat: number,
  lng: number,
) {
  const linked = await ctx.prisma.venue.findFirst({ where: { fieldGolfCourseId: courseId } });
  if (linked) return linked;
  const placeId = `${DEMO_VENUE_PLACE_PREFIX}field-${index}`;
  const existing = await ctx.prisma.venue.findUnique({
    where: { provider_providerPlaceId: { provider: 'CUSTOM', providerPlaceId: placeId } },
  });
  if (existing) {
    return ctx.prisma.venue.update({
      where: { id: existing.id },
      data: { fieldGolfCourseId: courseId, venueType: VenueType.FIELD, name },
    });
  }
  return ctx.prisma.venue.create({
    data: {
      sportId: ctx.sportId,
      provider: 'CUSTOM',
      providerPlaceId: placeId,
      name,
      address: name,
      latitude: lat,
      longitude: lng,
      venueType: VenueType.FIELD,
      fieldGolfCourseId: courseId,
      region: name,
    },
  });
}

type JoinPlan = {
  key: string;
  title: string;
  track: 'SCREEN' | 'FIELD';
  status: JoinStatus;
  host: DemoPersonaSlug;
  completed: DemoPersonaSlug[];
  confirmed: DemoPersonaSlug[];
  startOffsetHours: number;
  storeSlug?: string;
  fieldIndex?: number;
};

function buildJoinPlans(): JoinPlan[] {
  const plans: JoinPlan[] = [];
  for (let i = 0; i < 5; i += 1) {
    plans.push({
      key: `screen-completed-${i + 1}`,
      title: `강남 스크린 성사 #${i + 1}`,
      track: 'SCREEN',
      status: JoinStatus.COMPLETED,
      host: 'hajun',
      completed: i < 2 ? ['seoa', 'yerin'] : ['seoa'],
      confirmed: [],
      startOffsetHours: -24 * (3 + i * 2) - 19,
      storeSlug: 'gangnam',
    });
  }
  const fieldCompleted: DemoPersonaSlug[][] = [
    ['hajun', 'jihu', 'minjae'],
    ['jihu', 'minjae'],
    ['haneul'],
    ['haneul'],
    ['haneul'],
  ];
  for (let i = 0; i < 5; i += 1) {
    plans.push({
      key: `field-completed-${i + 1}`,
      title: `주말 필드 성사 #${i + 1}`,
      track: 'FIELD',
      status: JoinStatus.COMPLETED,
      host: 'taehyun',
      completed: fieldCompleted[i] ?? [],
      confirmed: [],
      startOffsetHours: -24 * (4 + i * 2) - 8,
      fieldIndex: i % 3,
    });
  }
  plans.push({
    key: 'store-completed-1',
    title: '수원 매장 매칭 성사',
    track: 'SCREEN',
    status: JoinStatus.COMPLETED,
    host: 'doyun',
    completed: [],
    confirmed: [],
    startOffsetHours: -24 * 6 - 20,
    storeSlug: 'suwon',
  });
  plans.push({
    key: 'club-completed-1',
    title: '클럽 스크린 야간 성사',
    track: 'SCREEN',
    status: JoinStatus.COMPLETED,
    host: 'minjae',
    completed: [],
    confirmed: [],
    startOffsetHours: -24 * 8 - 21,
    storeSlug: 'mapo',
  });
  plans.push({
    key: 'screen-ongoing-1',
    title: '분당 스크린 진행 중',
    track: 'SCREEN',
    status: JoinStatus.IN_PROGRESS,
    host: 'hajun',
    completed: [],
    confirmed: ['seoa', 'jihu'],
    startOffsetHours: -1,
    storeSlug: 'bundang',
  });
  plans.push({
    key: 'screen-upcoming-1',
    title: '강남 스크린 오늘 저녁 번개',
    track: 'SCREEN',
    status: JoinStatus.OPEN,
    host: 'hajun',
    completed: [],
    confirmed: ['yerin'],
    startOffsetHours: 6,
    storeSlug: 'gangnam',
  });
  plans.push({
    key: 'screen-upcoming-2',
    title: '마포 심야 스크린',
    track: 'SCREEN',
    status: JoinStatus.OPEN,
    host: 'doyun',
    completed: [],
    confirmed: ['haneul'],
    startOffsetHours: 10,
    storeSlug: 'mapo',
  });
  plans.push({
    key: 'field-upcoming-1',
    title: '주말 필드 오전 티오프',
    track: 'FIELD',
    status: JoinStatus.OPEN,
    host: 'taehyun',
    completed: [],
    confirmed: ['seoa', 'minjae'],
    startOffsetHours: 36,
    fieldIndex: 0,
  });
  plans.push({
    key: 'field-upcoming-2',
    title: '인천 오션 코스 모집',
    track: 'FIELD',
    status: JoinStatus.OPEN,
    host: 'haneul',
    completed: [],
    confirmed: ['jihu'],
    startOffsetHours: 60,
    fieldIndex: 2,
  });
  return plans;
}

async function seedJoins(ctx: SeedCtx): Promise<number> {
  const plans = buildJoinPlans();
  for (const plan of plans) {
    await upsertJoin(ctx, plan);
  }
  return plans.length;
}

async function upsertJoin(ctx: SeedCtx, plan: JoinPlan): Promise<void> {
  const host = mustUser(ctx, plan.host);
  const venueId = resolveJoinVenue(ctx, plan);
  const startAt = new Date(Date.now() + plan.startOffsetHours * 3600_000);
  const endAt = new Date(startAt.getTime() + 3 * 3600_000);
  const clientKey = `investor-demo:${plan.key}`;
  const existing = await ctx.prisma.join.findUnique({
    where: {
      hostUserId_clientIdempotencyKey: { hostUserId: host.id, clientIdempotencyKey: clientKey },
    },
  });
  const joinId = existing?.id ?? randomUUID();
  const title = `${DEMO_JOIN_TITLE_PREFIX}${plan.title}`;
  const roster = buildRoster(plan);
  if (!existing) {
    await ctx.prisma.join.create({
      data: {
        id: joinId,
        sportId: ctx.sportId,
        venueId,
        hostUserId: host.id,
        title,
        description: '초보·중급 환영 · 매너 라운드 · 정시 티오프',
        status: plan.status,
        startAt,
        scheduledEndAt: endAt,
        plannedPlayerCount: 4,
        confirmedPlayerCount: roster.length,
        rewardPerParticipant: 0,
        coinAssetId: ctx.coinAssetId,
        roomCreationFeeAmount: 0,
        rewardHoldTotalAmount: 0,
        shareSlug: createJoinShareSlug(randomBytes(10)),
        clientIdempotencyKey: clientKey,
        gameStyle: 'FRIENDLY',
        afterPlan: 'NONE',
        participants: {
          create: roster.map((row) => ({
            userId: mustUser(ctx, row.slug).id,
            role: row.role,
            participationStatus: row.status,
            attendanceIntent: row.status === ParticipationStatus.COMPLETED ? 'CONFIRMED' : 'PENDING',
          })),
        },
      },
    });
  } else {
    await ctx.prisma.join.update({
      where: { id: joinId },
      data: { title, status: plan.status, startAt, scheduledEndAt: endAt, venueId },
    });
    await ctx.prisma.joinParticipant.deleteMany({ where: { joinId } });
    await ctx.prisma.joinParticipant.createMany({
      data: roster.map((row) => ({
        joinId,
        userId: mustUser(ctx, row.slug).id,
        role: row.role,
        participationStatus: row.status,
      })),
    });
  }
  if (plan.track === 'FIELD') {
    await ctx.prisma.fieldJoinDetail.upsert({
      where: { joinId },
      create: {
        joinId,
        greenFeePerPerson: 140000,
        greenFeePayer: 'EACH_PERSON',
        cartFeeTotal: 80000,
        cartFeePayer: 'EQUAL_SPLIT',
        caddieMode: 'NO_CADDIE',
        roundHoles: 18,
        teeTimeMode: 'CONFIRMED',
      },
      update: { greenFeePerPerson: 140000, roundHoles: 18 },
    });
  }
}

function resolveJoinVenue(ctx: SeedCtx, plan: JoinPlan): string {
  if (plan.track === 'SCREEN') {
    const store = ctx.storeVenues.get(plan.storeSlug ?? 'gangnam');
    if (!store) throw new Error(`missing store venue ${plan.storeSlug}`);
    return store.venueId;
  }
  const index = plan.fieldIndex ?? 0;
  const venueId = ctx.fieldVenues[index] ?? ctx.fieldVenues[0];
  if (!venueId) throw new Error('missing field venue');
  return venueId;
}

function buildRoster(plan: JoinPlan): Array<{ slug: DemoPersonaSlug; role: ParticipantRole; status: ParticipationStatus }> {
  const rows: Array<{ slug: DemoPersonaSlug; role: ParticipantRole; status: ParticipationStatus }> = [
    {
      slug: plan.host,
      role: ParticipantRole.HOST,
      status: plan.status === JoinStatus.COMPLETED ? ParticipationStatus.COMPLETED : ParticipationStatus.CONFIRMED,
    },
  ];
  for (const slug of plan.completed) {
    if (slug === plan.host) continue;
    rows.push({ slug, role: ParticipantRole.PARTICIPANT, status: ParticipationStatus.COMPLETED });
  }
  for (const slug of plan.confirmed) {
    if (slug === plan.host || plan.completed.includes(slug)) continue;
    rows.push({ slug, role: ParticipantRole.PARTICIPANT, status: ParticipationStatus.CONFIRMED });
  }
  return rows;
}

async function seedBanners(prisma: PrismaClient): Promise<number> {
  for (const spec of DEMO_BANNERS) {
    const title = demoBannerTitle(spec);
    const existing = await prisma.homeBanner.findFirst({ where: { title } });
    const data = {
      title,
      subtitle: spec.subtitle,
      imageObjectKey: pexelsImageUrl(spec.pexelsId),
      href: spec.href,
      sortOrder: spec.sortOrder,
      active: true,
    };
    if (existing) {
      await prisma.homeBanner.update({ where: { id: existing.id }, data });
    } else {
      await prisma.homeBanner.create({ data: { id: randomUUID(), ...data } });
    }
  }
  return DEMO_BANNERS.length;
}

async function seedClub(ctx: SeedCtx): Promise<number> {
  const owner = mustUser(ctx, DEMO_CLUB.ownerSlug);
  const venueId = ctx.storeVenues.get('gangnam')?.venueId ?? null;
  const name = demoClubName();
  const existing = await ctx.prisma.club.findFirst({ where: { name } });
  const club = existing
    ? await ctx.prisma.club.update({
        where: { id: existing.id },
        data: { intro: DEMO_CLUB.intro, coverImageUrl: pexelsImageUrl(114296) },
      })
    : await ctx.prisma.club.create({
        data: {
          name,
          intro: DEMO_CLUB.intro,
          region: DEMO_CLUB.region,
          activityType: 'SCREEN_AND_FIELD',
          joinMode: 'INSTANT',
          visibility: 'PUBLIC',
          ownerUserId: owner.id,
          primaryVenueId: venueId,
          primaryVenueName: '강남 스크린 라운지',
          coverImageUrl: pexelsImageUrl(114296),
          inviteCode: 'invdemo-weekend',
        },
      });
  await ctx.prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId: club.id, userId: owner.id } },
    create: {
      clubId: club.id,
      userId: owner.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
    update: { role: 'OWNER', status: 'ACTIVE' },
  });
  for (const slug of DEMO_CLUB.memberSlugs) {
    const user = mustUser(ctx, slug);
    await ctx.prisma.clubMembership.upsert({
      where: { clubId_userId: { clubId: club.id, userId: user.id } },
      create: { clubId: club.id, userId: user.id, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() },
      update: { status: 'ACTIVE' },
    });
  }
  return 1;
}

async function seedDirectMessages(ctx: SeedCtx): Promise<number> {
  await upsertDemoConversation(ctx, 'hajun', 'seoa', [
    { from: 'seoa', body: '오늘 강남 스크린 자리 남아 있나요?' },
    { from: 'hajun', body: '네, 한 자리 있습니다. 7시 시작이에요.' },
  ]);
  await upsertDemoConversation(ctx, 'taehyun', 'minjae', [
    { from: 'minjae', body: '주말 필드 그린피 어떻게 정산할까요?' },
    { from: 'taehyun', body: '각자 그린피, 카트는 더치로 맞출게요.' },
  ]);
  return 2;
}

async function upsertDemoConversation(
  ctx: SeedCtx,
  a: DemoPersonaSlug,
  b: DemoPersonaSlug,
  messages: Array<{ from: DemoPersonaSlug; body: string }>,
): Promise<void> {
  const left = mustUser(ctx, a).id;
  const right = mustUser(ctx, b).id;
  const [low, high] = left < right ? [left, right] : [right, left];
  const conversation = await ctx.prisma.directConversation.upsert({
    where: { userLowId_userHighId: { userLowId: low, userHighId: high } },
    create: { userLowId: low, userHighId: high, lastMessageAt: new Date(), lastMessagePreview: messages.at(-1)?.body },
    update: { lastMessageAt: new Date(), lastMessagePreview: messages.at(-1)?.body },
  });
  await ctx.prisma.directConversationMember.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId: low } },
    create: { conversationId: conversation.id, userId: low },
    update: {},
  });
  await ctx.prisma.directConversationMember.upsert({
    where: { conversationId_userId: { conversationId: conversation.id, userId: high } },
    create: { conversationId: conversation.id, userId: high },
    update: {},
  });
  for (const [index, message] of messages.entries()) {
    const key = `investor-demo-dm:${a}:${b}:${index}`;
    await ctx.prisma.directMessage.upsert({
      where: { idempotencyKey: key },
      create: {
        conversationId: conversation.id,
        senderUserId: mustUser(ctx, message.from).id,
        body: message.body,
        idempotencyKey: key,
      },
      update: { body: message.body },
    });
  }
}

async function seedRewards(ctx: SeedCtx): Promise<{ attendanceCreated: number; milestonesCreated: number }> {
  const today = todayKstDate();
  let attendanceCreated = 0;
  let milestonesCreated = 0;
  for (const { id } of ctx.users.values()) {
    await ctx.ledger.getOrCreateWallet(id);
  }
  for (const { id, spec } of ctx.users.values()) {
    const dates = listRecentKstDates(spec.attendanceDays, spec.includeTodayAttendance, today);
    const attendance = await seedAttendanceHistory({
      prisma: ctx.prisma,
      ledger: ctx.ledger,
      userId: id,
      dates,
      amount: '1',
    });
    attendanceCreated += attendance.created;
    const hostCount = await ctx.prisma.join.count({ where: { hostUserId: id, status: 'COMPLETED' } });
    const participationCount = await ctx.prisma.joinParticipant.count({
      where: { userId: id, role: 'PARTICIPANT', participationStatus: 'COMPLETED' },
    });
    const milestones = await seedReachedMilestones({
      prisma: ctx.prisma,
      ledger: ctx.ledger,
      userId: id,
      hostCount,
      participationCount,
      hostMilestones: DEFAULT_HOST_MILESTONES,
      participationMilestones: DEFAULT_PARTICIPATION_MILESTONES,
    });
    milestonesCreated += milestones.created;
  }
  return { attendanceCreated, milestonesCreated };
}

function mustUser(ctx: SeedCtx, slug: DemoPersonaSlug): { id: string; spec: DemoPersonaSpec } {
  const row = ctx.users.get(slug);
  if (!row) throw new Error(`demo persona missing: ${slug}`);
  return row;
}
