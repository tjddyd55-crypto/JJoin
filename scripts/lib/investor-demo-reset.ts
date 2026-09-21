/**
 * Scoped reset: deletes only investor-demo tagged rows.
 * Never truncates, never touches protected DEV QA personas.
 *
 * User.deleteMany requires every hosted join gone first
 * (joins.host_user_id has no ON DELETE CASCADE).
 */
import type { PrismaClient } from '@prisma/client';
import {
  DEMO_COURSE_EXTERNAL_PREFIX,
  DEMO_FACILITY_KEY_PREFIX,
  DEMO_SUBJECT_PREFIX,
  DEMO_VENUE_PLACE_PREFIX,
  demoBannerTitles,
  demoClubInviteCodes,
  demoClubNames,
  isProtectedNickname,
  isProtectedProviderSubject,
} from './investor-demo-catalog.ts';
import { INVESTOR_DEMO_TAG } from './investor-demo-guard.ts';

const DELETE_CHUNK = 200;

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
  const userIds = await collectDemoUserIds(prisma);
  const [taggedJoinIds, hostedJoinIds, clubIds, bannerIds, facilityIds, courseIds, venueIds] =
    await Promise.all([
      collectTaggedJoinIds(prisma),
      collectHostedJoinIds(prisma, userIds),
      collectDemoClubIds(prisma, userIds),
      collectDemoBannerIds(prisma),
      collectIds(prisma.golfFacility, { governmentSourceKey: { startsWith: DEMO_FACILITY_KEY_PREFIX } }),
      collectIds(prisma.fieldGolfCourse, { externalId: { startsWith: DEMO_COURSE_EXTERNAL_PREFIX } }),
      collectIds(prisma.venue, { providerPlaceId: { startsWith: DEMO_VENUE_PLACE_PREFIX } }),
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
    joinIds: uniqueIds([...hostedJoinIds, ...taggedJoinIds]),
    clubIds,
    bannerIds,
    facilityIds,
    courseIds,
    venueIds,
    conversationIds,
  };
}

export async function resetInvestorDemo(prisma: PrismaClient): Promise<DemoResetPlan> {
  const plan = await collectDemoResetPlan(prisma);
  await deleteDemoJoins(prisma, plan.joinIds);
  await sweepHostedJoins(prisma, plan.userIds);
  await deleteDemoUserJoinLinks(prisma, plan.userIds);
  await deleteDemoClubs(prisma, plan.clubIds);
  await sweepOwnedClubs(prisma, plan.userIds);
  await deleteDemoUserClubLinks(prisma, plan.userIds);
  await deleteDemoConversations(prisma, plan.conversationIds);
  if (plan.bannerIds.length) {
    await prisma.homeBanner.deleteMany({ where: { id: { in: plan.bannerIds } } });
  }
  await deleteDemoUsers(prisma, plan.userIds);
  await deleteDemoVenuesAndMasters(prisma, plan);
  return plan;
}

async function collectDemoUserIds(prisma: PrismaClient): Promise<string[]> {
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
  return uniqueIds(userIds);
}

/** Dedicated host query — do not bury this inside a tagged-title OR. */
export async function collectHostedJoinIds(
  prisma: PrismaClient,
  userIds: string[],
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await prisma.join.findMany({
    where: { hostUserId: { in: userIds } },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function collectTaggedJoinIds(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.join.findMany({
    where: {
      OR: [
        { clientIdempotencyKey: { startsWith: 'investor-demo:' } },
        { title: { startsWith: '[INVESTOR-DEMO] ' } },
        { title: { startsWith: '[FIELD-E2E-' } },
      ],
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function collectDemoClubIds(prisma: PrismaClient, userIds: string[]): Promise<string[]> {
  const or: Array<Record<string, unknown>> = [
    { inviteCode: { in: demoClubInviteCodes() } },
    { inviteCode: { startsWith: 'invdemo-' } },
    { name: { startsWith: '[INVESTOR-DEMO] ' } },
    { name: { in: demoClubNames() } },
  ];
  if (userIds.length) or.push({ ownerUserId: { in: userIds } });
  const rows = await prisma.club.findMany({
    where: { OR: or },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function collectDemoBannerIds(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.homeBanner.findMany({
    where: {
      OR: [
        { title: { startsWith: '[INVESTOR-DEMO] ' } },
        { title: { in: demoBannerTitles() } },
        { title: '강남 스크린에서 오늘 저녁 한 게임' },
      ],
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

async function collectIds(
  delegate: { findMany: (args: unknown) => Promise<Array<{ id: string }>> },
  where: Record<string, unknown>,
): Promise<string[]> {
  const rows = await delegate.findMany({ where, select: { id: true } });
  return rows.map((row) => row.id);
}

export async function deleteDemoJoins(prisma: PrismaClient, joinIds: string[]): Promise<void> {
  if (joinIds.length === 0) return;
  for (const chunk of chunkIds(joinIds)) {
    await deleteJoinDependents(prisma, chunk);
    await prisma.join.deleteMany({ where: { id: { in: chunk } } });
  }
}

async function deleteJoinDependents(prisma: PrismaClient, joinIds: string[]): Promise<void> {
  await prisma.disputeCase.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.report.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.rewardSettlement.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.playerReview.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.joinInvitation.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.joinBookmark.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.joinChatMessage.deleteMany({ where: { room: { joinId: { in: joinIds } } } });
  await prisma.joinChatMember.deleteMany({ where: { room: { joinId: { in: joinIds } } } });
  await prisma.joinChatRoom.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.fieldJoinDetail.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.joinRequirement.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.joinOption.deleteMany({ where: { joinId: { in: joinIds } } });
  await prisma.joinParticipant.deleteMany({ where: { joinId: { in: joinIds } } });
}

/** Last-pass: every remaining join hosted by demo users, regardless of tags. */
async function sweepHostedJoins(prisma: PrismaClient, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const leftover = await collectHostedJoinIds(prisma, userIds);
  if (leftover.length) await deleteDemoJoins(prisma, leftover);
  await prisma.join.deleteMany({ where: { hostUserId: { in: userIds } } });
}

async function deleteDemoUserJoinLinks(prisma: PrismaClient, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  await prisma.joinParticipant.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.joinBookmark.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.joinInvitation.deleteMany({
    where: { OR: [{ inviterUserId: { in: userIds } }, { inviteeUserId: { in: userIds } }] },
  });
  await prisma.playerReview.deleteMany({
    where: { OR: [{ reviewerUserId: { in: userIds } }, { revieweeUserId: { in: userIds } }] },
  });
  await prisma.report.deleteMany({ where: { reporterUserId: { in: userIds } } });
  await prisma.disputeCase.deleteMany({
    where: { OR: [{ openedByUserId: { in: userIds } }, { resolvedByAdminUserId: { in: userIds } }] },
  });
}

async function deleteDemoUsers(prisma: PrismaClient, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const leftoverHosted = await prisma.join.count({ where: { hostUserId: { in: userIds } } });
  if (leftoverHosted > 0) {
    throw new Error(`${INVESTOR_DEMO_TAG} reset_aborted hosted_joins_remain ${leftoverHosted}`);
  }
  await prisma.coinIssuance.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
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
    await prisma.join.updateMany({ where: { clubEventId: { in: eventIds } }, data: { clubEventId: null } });
    await prisma.clubEvent.deleteMany({ where: { id: { in: eventIds } } });
  }
  await prisma.clubAccountingEntry.deleteMany({ where: { clubId: { in: clubIds } } });
  await prisma.clubNotice.deleteMany({ where: { clubId: { in: clubIds } } });
  await prisma.clubMembership.deleteMany({ where: { clubId: { in: clubIds } } });
  await prisma.clubActivityRegion.deleteMany({ where: { clubId: { in: clubIds } } });
  await prisma.join.updateMany({ where: { clubId: { in: clubIds } }, data: { clubId: null } });
  await prisma.club.deleteMany({ where: { id: { in: clubIds } } });
}

async function sweepOwnedClubs(prisma: PrismaClient, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const owned = await prisma.club.findMany({
    where: { ownerUserId: { in: userIds } },
    select: { id: true },
  });
  if (owned.length) await deleteDemoClubs(prisma, owned.map((row) => row.id));
}

async function deleteDemoUserClubLinks(prisma: PrismaClient, userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  const createdEvents = await prisma.clubEvent.findMany({
    where: { createdByUserId: { in: userIds } },
    select: { id: true },
  });
  const eventIds = createdEvents.map((row) => row.id);
  if (eventIds.length) {
    await prisma.clubEventAttendance.deleteMany({ where: { clubEventId: { in: eventIds } } });
    await prisma.join.updateMany({ where: { clubEventId: { in: eventIds } }, data: { clubEventId: null } });
    await prisma.clubEvent.deleteMany({ where: { id: { in: eventIds } } });
  }
  await prisma.clubAccountingEntry.deleteMany({ where: { createdByUserId: { in: userIds } } });
  await prisma.clubNotice.deleteMany({ where: { createdByUserId: { in: userIds } } });
  await prisma.clubMembership.deleteMany({ where: { userId: { in: userIds } } });
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

function chunkIds(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    out.push(ids.slice(i, i + DELETE_CHUNK));
  }
  return out;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
