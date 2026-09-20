/**
 * Scoped reset: deletes only investor-demo tagged rows.
 * Never truncates, never touches protected DEV QA personas.
 */
import type { PrismaClient } from '@prisma/client';
import {
  DEMO_BANNER_TITLE_PREFIX,
  DEMO_CLUB_NAME_PREFIX,
  DEMO_COURSE_EXTERNAL_PREFIX,
  DEMO_FACILITY_KEY_PREFIX,
  DEMO_JOIN_TITLE_PREFIX,
  DEMO_SUBJECT_PREFIX,
  DEMO_VENUE_PLACE_PREFIX,
  isProtectedNickname,
  isProtectedProviderSubject,
} from './investor-demo-catalog.ts';
import { INVESTOR_DEMO_TAG } from './investor-demo-guard.ts';

export type DemoResetPlan = {
  userIds: string[];
  joinIds: string[];
  clubIds: string[];
  bannerIds: string[];
  facilityIds: string[];
  courseIds: string[];
  venueIds: string[];
  conversationIds: string[];
};

export async function collectDemoResetPlan(prisma: PrismaClient): Promise<DemoResetPlan> {
  const accounts = await prisma.socialAccount.findMany({
    where: { providerSubject: { startsWith: DEMO_SUBJECT_PREFIX } },
    select: {
      userId: true,
      providerSubject: true,
      user: { select: { profile: { select: { nickname: true } } } },
    },
  });

  const userIds: string[] = [];
  for (const account of accounts) {
    const nickname = account.user.profile?.nickname ?? '';
    if (isProtectedProviderSubject(account.providerSubject) || isProtectedNickname(nickname)) {
      throw new Error(`${INVESTOR_DEMO_TAG} reset_aborted protected_account ${account.providerSubject}`);
    }
    userIds.push(account.userId);
  }

  const joinOr: Array<
    | { title: { startsWith: string } }
    | { clientIdempotencyKey: { startsWith: string } }
    | { hostUserId: { in: string[] } }
  > = [
    { title: { startsWith: DEMO_JOIN_TITLE_PREFIX } },
    { clientIdempotencyKey: { startsWith: 'investor-demo:' } },
  ];
  if (userIds.length) joinOr.push({ hostUserId: { in: userIds } });

  const [joins, clubs, banners, facilities, courses, venues] = await Promise.all([
    prisma.join.findMany({
      where: { OR: joinOr },
      select: { id: true },
    }),
    prisma.club.findMany({
      where: { name: { startsWith: DEMO_CLUB_NAME_PREFIX } },
      select: { id: true },
    }),
    prisma.homeBanner.findMany({
      where: { title: { startsWith: DEMO_BANNER_TITLE_PREFIX } },
      select: { id: true },
    }),
    prisma.golfFacility.findMany({
      where: { governmentSourceKey: { startsWith: DEMO_FACILITY_KEY_PREFIX } },
      select: { id: true },
    }),
    prisma.fieldGolfCourse.findMany({
      where: { externalId: { startsWith: DEMO_COURSE_EXTERNAL_PREFIX } },
      select: { id: true },
    }),
    prisma.venue.findMany({
      where: { providerPlaceId: { startsWith: DEMO_VENUE_PLACE_PREFIX } },
      select: { id: true },
    }),
  ]);

  const conversationIds =
    userIds.length === 0
      ? []
      : (
          await prisma.directConversation.findMany({
            where: {
              AND: [{ userLowId: { in: userIds } }, { userHighId: { in: userIds } }],
            },
            select: { id: true },
          })
        ).map((row) => row.id);

  return {
    userIds,
    joinIds: uniqueIds(joins.map((row) => row.id)),
    clubIds: clubs.map((row) => row.id),
    bannerIds: banners.map((row) => row.id),
    facilityIds: facilities.map((row) => row.id),
    courseIds: courses.map((row) => row.id),
    venueIds: venues.map((row) => row.id),
    conversationIds,
  };
}

export async function resetInvestorDemo(prisma: PrismaClient): Promise<DemoResetPlan> {
  const plan = await collectDemoResetPlan(prisma);
  await deleteDemoJoins(prisma, plan.joinIds);
  await deleteDemoClubs(prisma, plan.clubIds);
  await deleteDemoConversations(prisma, plan.conversationIds);
  if (plan.bannerIds.length) {
    await prisma.homeBanner.deleteMany({ where: { id: { in: plan.bannerIds } } });
  }
  if (plan.userIds.length) {
    await prisma.coinIssuance.deleteMany({ where: { userId: { in: plan.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: plan.userIds } } });
  }
  await deleteDemoVenuesAndMasters(prisma, plan);
  return plan;
}

async function deleteDemoJoins(prisma: PrismaClient, joinIds: string[]): Promise<void> {
  if (joinIds.length === 0) return;
  await prisma.joinChatMessage.deleteMany({ where: { room: { joinId: { in: joinIds } } } });
  await prisma.joinChatMember.deleteMany({ where: { room: { joinId: { in: joinIds } } } });
  await prisma.joinChatRoom.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.joinBookmark.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.joinInvitation.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.playerReview.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.join.deleteMany({ where: { id: { in: joinIds } } });
}

async function deleteDemoClubs(prisma: PrismaClient, clubIds: string[]): Promise<void> {
  if (clubIds.length === 0) return;
  const events = await prisma.clubEvent.findMany({
    where: { clubId: { in: clubIds } },
    select: { id: true },
  });
  const eventIds = events.map((row) => row.id);
  if (eventIds.length) {
    await prisma.clubEventAttendance.deleteMany({ where: { clubEventId: { in: eventIds } } });
    await prisma.clubEvent.deleteMany({ where: { id: { in: eventIds } } });
  }
  await prisma.clubAccountingEntry.deleteMany({ where: { clubId: { in: clubIds } } });
  await prisma.clubNotice.deleteMany({ where: { clubId: { in: clubIds } } });
  await prisma.clubMembership.deleteMany({ where: { clubId: { in: clubIds } } });
  await prisma.clubActivityRegion.deleteMany({ where: { clubId: { in: clubIds } } });
  await prisma.club.deleteMany({ where: { id: { in: clubIds } } });
}

async function deleteDemoConversations(prisma: PrismaClient, conversationIds: string[]): Promise<void> {
  if (conversationIds.length === 0) return;
  await prisma.directMessage.deleteMany({ where: { conversationId: { in: conversationIds } } });
  await prisma.directConversationMember.deleteMany({
    where: { conversationId: { in: conversationIds } },
  });
  await prisma.directConversation.deleteMany({ where: { id: { in: conversationIds } } });
}

async function deleteDemoVenuesAndMasters(prisma: PrismaClient, plan: DemoResetPlan): Promise<void> {
  if (plan.venueIds.length) {
    await prisma.venue.deleteMany({ where: { id: { in: plan.venueIds } } });
  }
  if (plan.facilityIds.length) {
    await prisma.storeBannerAdRequest.deleteMany({
      where: { ownership: { golfFacilityId: { in: plan.facilityIds } } },
    });
    await prisma.storeOwnership.deleteMany({ where: { golfFacilityId: { in: plan.facilityIds } } });
    await prisma.golfFacility.deleteMany({ where: { id: { in: plan.facilityIds } } });
  }
  if (plan.courseIds.length) {
    await prisma.fieldGolfCourse.deleteMany({ where: { id: { in: plan.courseIds } } });
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
