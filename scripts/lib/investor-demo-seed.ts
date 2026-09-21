/**
 * Investor demo upserts. Prisma-only inserts — never call live join-create
 * APIs, so JOIN_CREATED push / notification outbox / inbox are not fan-out.
 * Mass OPEN joins do not grant attendance or achievement rewards.
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
import { DEFAULT_FEATURE_FLAGS } from '../../packages/domain/src/feature-flags.ts';
import { DEFAULT_HOST_MILESTONES, DEFAULT_PARTICIPATION_MILESTONES } from '../../packages/domain/src/attendance-rewards.ts';
import { createJoinShareSlug } from '../../packages/domain/src/join-engagement.ts';
import { TERMS_VERSION } from '../../apps/api/src/auth/consent-policy.ts';
import { CoinLedgerService } from '../../apps/api/src/modules/wallet/coin-ledger.service.ts';
import type { PrismaService } from '../../apps/api/src/prisma/prisma.service.ts';
import { ensureFoundation } from '../../apps/api/src/foundation/ensure-foundation.ts';
import {
  bannerAssetRef,
  clubAssetRef,
  inspectDemoAssets,
  personaAvatarRef,
  resolvePublicAssetUrl,
  storeCoverRef,
  storeGalleryRef,
} from './investor-demo-assets.ts';
import {
  DEMO_CLUBS,
  DEMO_PERSONAS,
  DEMO_STORES,
  DEMO_BANNERS,
  DEMO_FIELD_COURSE_FALLBACKS,
  DEMO_TODAY_FIELD_SLUGS,
  DEMO_TODAY_SCREEN_VENUES,
  DEMO_FACILITY_KEY_PREFIX,
  DEMO_COURSE_EXTERNAL_PREFIX,
  DEMO_VENUE_PLACE_PREFIX,
  INVESTOR_DEMO_BATCH_VERSION,
  buildJoinPlans,
  demoBannerTitle,
  demoClubName,
  demoEmail,
  demoProviderSubject,
  joinIdempotencyKey,
  summarizeJoinPlans,
  type DemoJoinPlan,
  type DemoPersonaSlug,
  type DemoPersonaSpec,
} from './investor-demo-catalog.ts';
import { INVESTOR_DEMO_TAG } from './investor-demo-guard.ts';
import { resolveDemoSlotEndAt } from './investor-demo-schedule.ts';
import { listRecentKstDates, seedAttendanceHistory, seedReachedMilestones, todayKstDate } from './investor-demo-rewards.ts';
import { uploadInvestorDemoAssets } from './investor-demo-upload.ts';

export type SeedSummary = {
  batchVersion: string;
  users: Array<{ slug: string; nickname: string; userId: string }>;
  stores: number;
  fieldVenues: number;
  joins: number;
  joinBreakdown: ReturnType<typeof summarizeJoinPlans>;
  banners: number;
  clubs: number;
  conversations: number;
  attendanceCreated: number;
  milestonesCreated: number;
  assets: { present: number; required: number; uploaded: number; reused: number; skipped: boolean };
};

type SeedCtx = {
  prisma: PrismaClient;
  ledger: CoinLedgerService;
  sportId: string;
  coinAssetId: string;
  users: Map<DemoPersonaSlug, { id: string; spec: DemoPersonaSpec }>;
  storeVenues: Map<string, { venueId: string; facilityId: string; ownershipId: string }>;
  fieldVenues: string[];
  fieldVenuesBySlug: Map<string, string>;
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
    fieldVenuesBySlug: new Map(),
  };
  await ensureFeatureFlags(prisma);
  const upload = await uploadInvestorDemoAssets();
  const inspection = inspectDemoAssets();
  await seedUsers(ctx);
  await seedStores(ctx);
  await seedTodayScreenCluster(ctx);
  const fieldSeed = await seedFieldVenues(ctx);
  ctx.fieldVenues = fieldSeed.ids;
  ctx.fieldVenuesBySlug = fieldSeed.bySlug;
  const joinPlans = buildJoinPlans(new Date());
  const joins = await seedJoins(ctx, joinPlans);
  const banners = await seedBanners(prisma);
  const clubs = await seedClubs(ctx);
  const conversations = await seedDirectMessages(ctx);
  const rewards = await seedRewards(ctx);
  return {
    batchVersion: INVESTOR_DEMO_BATCH_VERSION,
    users: [...ctx.users.values()].map((row) => ({
      slug: row.spec.slug,
      nickname: row.spec.nickname,
      userId: row.id,
    })),
    stores: ctx.storeVenues.size,
    fieldVenues: ctx.fieldVenues.length,
    joins,
    joinBreakdown: summarizeJoinPlans(joinPlans),
    banners,
    clubs,
    conversations,
    attendanceCreated: rewards.attendanceCreated,
    milestonesCreated: rewards.milestonesCreated,
    assets: {
      present: inspection.present,
      required: inspection.required,
      uploaded: upload.uploaded,
      reused: upload.reused,
      skipped: upload.skipped,
    },
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
      clubsUiEnabled: DEFAULT_FEATURE_FLAGS.clubsUiEnabled,
    },
    update: {
      homeBannersEnabled: true,
      attendanceRewardsEnabled: true,
      storeProfilesEnabled: true,
      clubsUiEnabled: DEFAULT_FEATURE_FLAGS.clubsUiEnabled,
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
      age: spec.age,
      heightCm: spec.heightCm,
      bio: spec.bio,
      regionLabel: spec.regionLabel,
      regionCode: spec.regionCode,
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
  const objectKey = personaAvatarRef(slug).objectKey;
  const existing = await prisma.mediaAsset.findFirst({
    where: { ownerUserId: userId, kind: 'AVATAR' },
  });
  if (existing) {
    await prisma.mediaAsset.update({
      where: { id: existing.id },
      data: { storageKey: objectKey, mimeType: 'image/jpeg' },
    });
    return existing.id;
  }
  const created = await prisma.mediaAsset.create({
    data: {
      ownerUserId: userId,
      kind: 'AVATAR',
      storageKey: objectKey,
      mimeType: 'image/jpeg',
    },
  });
  return created.id;
}

async function replaceProfilePhotos(prisma: PrismaClient, userId: string, slug: DemoPersonaSlug): Promise<void> {
  const objectKey = personaAvatarRef(slug).objectKey;
  await prisma.userProfilePhoto.deleteMany({ where: { userId } });
  await prisma.userProfilePhoto.create({
    data: { userId, objectKey, sortOrder: 0, isPrimary: true },
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
    } else {
      await ctx.prisma.golfFacility.update({
        where: { id: facility.id },
        data: {
          displayName: store.name,
          sourceName: store.name,
          sido: store.sido,
          sigungu: store.sigungu,
          latitude: store.lat,
          longitude: store.lng,
          isActive: true,
          isScreenJoinEligible: true,
        },
      });
    }
    const venue = await ensureScreenVenue(ctx, facility.id, store.slug, store.name, store.lat, store.lng);
    const ownership = await ctx.prisma.storeOwnership.upsert({
      where: { userId_golfFacilityId: { userId: owner.id, golfFacilityId: facility.id } },
      create: { userId: owner.id, golfFacilityId: facility.id, venueId: venue.id, status: 'ACTIVE' },
      update: { status: 'ACTIVE', venueId: venue.id },
    });
    await upsertStoreProfile(ctx, ownership.id, store);
    ctx.storeVenues.set(store.slug, {
      venueId: venue.id,
      facilityId: facility.id,
      ownershipId: ownership.id,
    });
  }
}

async function seedTodayScreenCluster(ctx: SeedCtx): Promise<void> {
  for (const spec of DEMO_TODAY_SCREEN_VENUES) {
    if (spec.storeSlug) {
      const existing = ctx.storeVenues.get(spec.storeSlug);
      if (!existing) throw new Error(`${INVESTOR_DEMO_TAG} missing hub store ${spec.storeSlug}`);
      ctx.storeVenues.set(spec.slug, existing);
      continue;
    }
    const facilityKey = `${DEMO_FACILITY_KEY_PREFIX}${spec.slug}`;
    let facility = await ctx.prisma.golfFacility.findFirst({
      where: { governmentSourceKey: facilityKey },
    });
    if (!facility) {
      facility = await ctx.prisma.golfFacility.create({
        data: {
          source: 'MANUAL',
          governmentSourceKey: facilityKey,
          managementNo: `INV-DEMO-${spec.slug}`,
          localGovernmentCode: '11140',
          sourceName: spec.name,
          displayName: spec.name,
          normalizedName: spec.name.toLowerCase(),
          facilityType: 'SCREEN_GOLF',
          latitude: spec.lat,
          longitude: spec.lng,
          coordinateStatus: 'VALID',
          coordinateSource: 'MANUAL',
          isActive: true,
          isScreenJoinEligible: true,
          hasScreenGolf: 'YES',
          screenStatus: 'CONFIRMED',
          sido: spec.sido,
          sigungu: spec.sigungu,
          roadAddress: `${spec.sido} ${spec.sigungu} ${spec.name}`,
        },
      });
    } else {
      await ctx.prisma.golfFacility.update({
        where: { id: facility.id },
        data: {
          displayName: spec.name,
          sido: spec.sido,
          sigungu: spec.sigungu,
          latitude: spec.lat,
          longitude: spec.lng,
          isActive: true,
          isScreenJoinEligible: true,
        },
      });
    }
    const venue = await ensureScreenVenue(ctx, facility.id, spec.slug, spec.name, spec.lat, spec.lng);
    ctx.storeVenues.set(spec.slug, {
      venueId: venue.id,
      facilityId: facility.id,
      ownershipId: '',
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
  if (existing) {
    return ctx.prisma.venue.update({
      where: { id: existing.id },
      data: {
        name,
        address: `${name}`,
        latitude: lat,
        longitude: lng,
        region: name,
        venueType: VenueType.SCREEN,
        golfFacilityId: facilityId,
      },
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
      venueType: VenueType.SCREEN,
      golfFacilityId: facilityId,
      region: name,
    },
  });
}

async function upsertStoreProfile(
  ctx: SeedCtx,
  ownershipId: string,
  store: (typeof DEMO_STORES)[number],
): Promise<void> {
  const cover = storeCoverRef(store.slug).objectKey;
  const gallery = [cover];
  for (let i = 1; i < store.galleryCount; i += 1) {
    gallery.push(storeGalleryRef(store.slug, i).objectKey);
  }
  const profile = await ctx.prisma.storeProfile.upsert({
    where: { ownershipId },
    create: {
      ownershipId,
      intro: store.intro,
      vibe: store.vibe,
      amenities: ['PARKING', 'LOUNGE', 'SHOWER'],
      screenBrand: store.brand,
      screenBrandOther: store.brandOther ?? null,
      visibility: 'PUBLIC',
      coverObjectKey: cover,
      parkingAvailable: true,
      roomCount: 8,
    },
    update: {
      intro: store.intro,
      vibe: store.vibe,
      screenBrand: store.brand,
      screenBrandOther: store.brandOther ?? null,
      visibility: 'PUBLIC',
      coverObjectKey: cover,
    },
  });
  await ctx.prisma.storeProfilePhoto.deleteMany({ where: { profileId: profile.id } });
  await ctx.prisma.storeProfilePhoto.createMany({
    data: gallery.map((objectKey, sortOrder) => ({ profileId: profile.id, objectKey, sortOrder })),
  });
  await ctx.prisma.storeOperatingHours.deleteMany({ where: { profileId: profile.id } });
  await ctx.prisma.storeOperatingHours.createMany({
    data: [
      { profileId: profile.id, dayGroup: 'WEEKDAY', startTime: '10:00', endTime: '24:00', sortOrder: 0 },
      { profileId: profile.id, dayGroup: 'WEEKEND', startTime: '09:00', endTime: '02:00', sortOrder: 1 },
    ],
  });
}

async function seedFieldVenues(
  ctx: SeedCtx,
): Promise<{ ids: string[]; bySlug: Map<string, string> }> {
  const fallbacks = await createFallbackCourses(ctx);
  const bySlug = new Map<string, string>();
  const ids: string[] = [];
  for (const course of fallbacks) {
    const venue = await ensureFieldVenue(ctx, {
      courseId: course.id,
      slug: course.slug,
      name: course.name,
      lat: Number(course.latitude ?? 37.2),
      lng: Number(course.longitude ?? 127.1),
    });
    ids.push(venue.id);
    bySlug.set(course.slug, venue.id);
  }
  const hubIds = new Set(fallbacks.map((row) => row.id));
  const existing = await ctx.prisma.fieldGolfCourse.findMany({
    where: { isActive: true, latitude: { not: null }, sido: { not: null }, id: { notIn: [...hubIds] } },
    take: 13,
    orderBy: { name: 'asc' },
  });
  for (const [index, course] of existing.entries()) {
    const venue = await ensureFieldVenue(ctx, {
      courseId: course.id,
      slug: `odcloud-${index}`,
      name: course.name,
      lat: Number(course.latitude ?? 37.2),
      lng: Number(course.longitude ?? 127.1),
    });
    ids.push(venue.id);
  }
  for (const slug of DEMO_TODAY_FIELD_SLUGS) {
    if (!bySlug.has(slug)) throw new Error(`${INVESTOR_DEMO_TAG} missing today field hub ${slug}`);
  }
  return { ids, bySlug };
}

async function createFallbackCourses(ctx: SeedCtx) {
  const created: Array<{
    id: string;
    slug: string;
    name: string;
    latitude: unknown;
    longitude: unknown;
  }> = [];
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
      update: {
        isActive: true,
        name: spec.name,
        address: spec.address,
        roadAddress: spec.address,
        sido: spec.sido,
        sigungu: spec.sigungu,
        latitude: spec.lat,
        longitude: spec.lng,
        holeCount: spec.holeCount,
      },
    });
    created.push({
      id: course.id,
      slug: spec.slug,
      name: course.name,
      latitude: course.latitude,
      longitude: course.longitude,
    });
  }
  return created;
}

async function ensureFieldVenue(
  ctx: SeedCtx,
  input: { courseId: string; slug: string; name: string; lat: number; lng: number },
) {
  const { courseId, slug, name, lat, lng } = input;
  const linked = await ctx.prisma.venue.findFirst({ where: { fieldGolfCourseId: courseId } });
  if (linked) {
    return ctx.prisma.venue.update({
      where: { id: linked.id },
      data: { venueType: VenueType.FIELD, fieldGolfCourseId: courseId, name, latitude: lat, longitude: lng },
    });
  }
  const placeId = `${DEMO_VENUE_PLACE_PREFIX}field-${slug}`;
  const existing = await ctx.prisma.venue.findUnique({
    where: { provider_providerPlaceId: { provider: 'CUSTOM', providerPlaceId: placeId } },
  });
  if (existing) {
    return ctx.prisma.venue.update({
      where: { id: existing.id },
      data: { fieldGolfCourseId: courseId, venueType: VenueType.FIELD, name, latitude: lat, longitude: lng },
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

async function seedJoins(ctx: SeedCtx, plans: DemoJoinPlan[]): Promise<number> {
  for (const plan of plans) {
    await upsertJoin(ctx, plan);
  }
  return plans.length;
}

async function upsertJoin(ctx: SeedCtx, plan: DemoJoinPlan): Promise<void> {
  const host = mustUser(ctx, plan.host);
  const venueId = resolveJoinVenue(ctx, plan);
  const startAt = plan.startAt;
  const endAt = plan.scheduledEndAt ?? resolveDemoSlotEndAt(startAt, new Date());
  const clientKey = joinIdempotencyKey(plan.key);
  const existing = await ctx.prisma.join.findUnique({
    where: {
      hostUserId_clientIdempotencyKey: { hostUserId: host.id, clientIdempotencyKey: clientKey },
    },
  });
  const joinId = existing?.id ?? randomUUID();
  const roster = buildRoster(plan);
  const data = {
    title: plan.title,
    description: plan.description,
    status: plan.status,
    startAt,
    scheduledEndAt: endAt,
    venueId,
    plannedPlayerCount: plan.plannedPlayerCount,
    confirmedPlayerCount: roster.length,
    preferredGender: plan.condition.preferredGender,
    minAge: plan.condition.minAge,
    maxAge: plan.condition.maxAge,
    participantSkillMode: plan.condition.participantSkillMode,
    minScreenHandicap: plan.condition.minScreenHandicap,
    maxScreenHandicap: plan.condition.maxScreenHandicap,
    gameStyle: plan.condition.gameStyle,
    afterPlan: plan.condition.afterPlan,
    isUrgent: Boolean(plan.isUrgent),
    urgentUntil: plan.isUrgent ? startAt : null,
    urgentSeats: plan.isUrgent ? Math.max(1, plan.plannedPlayerCount - roster.length) : null,
  };
  if (!existing) {
    await ctx.prisma.join.create({
      data: {
        id: joinId,
        sportId: ctx.sportId,
        hostUserId: host.id,
        rewardPerParticipant: 0,
        coinAssetId: ctx.coinAssetId,
        roomCreationFeeAmount: 0,
        rewardHoldTotalAmount: 0,
        shareSlug: createJoinShareSlug(randomBytes(10)),
        clientIdempotencyKey: clientKey,
        ...data,
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
    await ctx.prisma.join.update({ where: { id: joinId }, data });
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
        greenFeePerPerson: plan.greenFeePerPerson ?? 140000,
        greenFeePayer: 'EACH_PERSON',
        cartFeeTotal: 80000,
        cartFeePayer: 'EQUAL_SPLIT',
        caddieMode: 'NO_CADDIE',
        roundHoles: 18,
        teeTimeMode: 'CONFIRMED',
      },
      update: { greenFeePerPerson: plan.greenFeePerPerson ?? 140000, roundHoles: 18 },
    });
  }
}

function resolveJoinVenue(ctx: SeedCtx, plan: DemoJoinPlan): string {
  if (plan.track === 'SCREEN') {
    const store = ctx.storeVenues.get(plan.storeSlug ?? 'gangnam');
    if (!store) throw new Error(`missing store venue ${plan.storeSlug}`);
    return store.venueId;
  }
  if (plan.courseSlug) {
    const bySlug = ctx.fieldVenuesBySlug.get(plan.courseSlug);
    if (bySlug) return bySlug;
  }
  const index = plan.fieldIndex != null && plan.fieldIndex >= 0 ? plan.fieldIndex : 0;
  const venueId = ctx.fieldVenues[index % ctx.fieldVenues.length] ?? ctx.fieldVenues[0];
  if (!venueId) throw new Error('missing field venue');
  return venueId;
}

function buildRoster(
  plan: DemoJoinPlan,
): Array<{ slug: DemoPersonaSlug; role: ParticipantRole; status: ParticipationStatus }> {
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
    const imageObjectKey = bannerAssetRef(spec.slug).objectKey;
    const data = {
      title,
      subtitle: spec.subtitle,
      imageObjectKey,
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

async function seedClubs(ctx: SeedCtx): Promise<number> {
  for (const spec of DEMO_CLUBS) {
    const owner = mustUser(ctx, spec.ownerSlug);
    const venueId = ctx.storeVenues.get('gangnam')?.venueId ?? null;
    const name = demoClubName(spec.name);
    const cover = resolvePublicAssetUrl(clubAssetRef(spec.coverAsset).objectKey);
    const existing = await ctx.prisma.club.findFirst({
      where: { OR: [{ inviteCode: spec.inviteCode }, { name }] },
    });
    const club = existing
      ? await ctx.prisma.club.update({
          where: { id: existing.id },
          data: { intro: spec.intro, coverImageUrl: cover, inviteCode: spec.inviteCode },
        })
      : await ctx.prisma.club.create({
          data: {
            name,
            intro: spec.intro,
            region: spec.region,
            activityType: 'SCREEN_AND_FIELD',
            joinMode: 'INSTANT',
            visibility: 'PUBLIC',
            ownerUserId: owner.id,
            primaryVenueId: venueId,
            primaryVenueName: '강남 스크린 라운지',
            coverImageUrl: cover,
            inviteCode: spec.inviteCode,
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
    for (const slug of spec.memberSlugs) {
      const user = mustUser(ctx, slug);
      await ctx.prisma.clubMembership.upsert({
        where: { clubId_userId: { clubId: club.id, userId: user.id } },
        create: { clubId: club.id, userId: user.id, role: 'MEMBER', status: 'ACTIVE', joinedAt: new Date() },
        update: { status: 'ACTIVE' },
      });
    }
  }
  return DEMO_CLUBS.length;
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
  await upsertDemoConversation(ctx, 'dohyun', 'chaewon', [
    { from: 'chaewon', body: '일산 저녁 타임 내일도 열까요?' },
    { from: 'dohyun', body: '네, 여덟 시 반으로 올려둘게요.' },
  ]);
  return 3;
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
  if (!row) throw new Error(`${INVESTOR_DEMO_TAG} persona missing: ${slug}`);
  return row;
}
