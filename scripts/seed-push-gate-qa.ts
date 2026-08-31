/**
 * DEV QA fixtures for push / reminder / preference E2E.
 * Tag: [QA-PUSH-GATE]
 * Usage: DATABASE_URL=... pnpm exec tsx scripts/seed-push-gate-qa.ts
 * Never touches Production.
 */
import { PrismaClient, NotificationType, ProductEventType } from '@prisma/client';

const TAG = '[QA-PUSH-GATE]';
const MS_H = 60 * 60 * 1000;

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { profile: { nickname: { contains: 'DEV' } } },
      take: 4,
      select: { id: true, profile: { select: { nickname: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (users.length < 2) {
      console.log(JSON.stringify({ ok: false, err: 'need_2_dev_users', tag: TAG }));
      return;
    }
    const [a, b] = users;

    await prisma.notificationPreference.upsert({
      where: { userId: a!.id },
      create: { userId: a!.id },
      update: {
        urgentJoinEnabled: true,
        joinAlertsEnabled: true,
        followedStoreEnabled: true,
        invitationEnabled: true,
        attendanceReminderEnabled: true,
      },
    });
    await prisma.notificationPreference.upsert({
      where: { userId: b!.id },
      create: {
        userId: b!.id,
        urgentJoinEnabled: false,
        attendanceReminderEnabled: true,
      },
      update: {
        urgentJoinEnabled: false,
        attendanceReminderEnabled: true,
      },
    });

    const now = Date.now();
    const venue = await prisma.venue.findFirst({
      where: { golfFacilityId: { not: null } },
      select: { id: true, golfFacilityId: true, name: true },
    });
    if (!venue) {
      console.log(JSON.stringify({ ok: false, err: 'no_venue', tag: TAG }));
      return;
    }

    const sport = await prisma.sport.findFirst({ select: { id: true } });
    if (!sport) {
      console.log(JSON.stringify({ ok: false, err: 'no_sport', tag: TAG }));
      return;
    }

    // Soft-delete prior QA joins by renaming title
    const mkJoin = async (hoursFromNow: number, status: 'OPEN' | 'CANCELLED', title: string) => {
      return prisma.join.create({
        data: {
          hostUserId: a!.id,
          venueId: venue.id,
          sportId: sport.id,
          status,
          startAt: new Date(now + hoursFromNow * MS_H),
          scheduledEndAt: new Date(now + (hoursFromNow + 2) * MS_H),
          plannedPlayerCount: 4,
          confirmedPlayerCount: 2,
          title: `${TAG} ${title}`,
          description: TAG,
          joinKind: 'STANDARD',
          joinMethod: 'OPEN',
          rewardPerParticipant: '0',
          roomCreationFeeAmount: '0',
          rewardHoldTotalAmount: '0',
          coinAssetId: (
            await prisma.coinAsset.findFirstOrThrow({ select: { id: true } })
          ).id,
          cancelledAt: status === 'CANCELLED' ? new Date() : null,
        },
      });
    };

    const join24 = await mkJoin(24, 'OPEN', '24h');
    const join3 = await mkJoin(3, 'OPEN', '3h');
    const joinDeclined = await mkJoin(24, 'OPEN', 'declined');
    const joinCancelled = await mkJoin(24, 'CANCELLED', 'cancelled');

    const addParticipant = async (
      joinId: string,
      userId: string,
      intent: 'PENDING' | 'DECLINED',
    ) => {
      await prisma.joinParticipant.create({
        data: {
          joinId,
          userId,
          role: 'PARTICIPANT',
          participationStatus: intent === 'DECLINED' ? 'CANCELLED' : 'APPROVED',
          approvedAt: new Date(),
          attendanceIntent: intent,
          attendanceIntentAt: intent === 'DECLINED' ? new Date() : null,
        },
      });
    };

    await addParticipant(join24.id, b!.id, 'PENDING');
    await addParticipant(join3.id, b!.id, 'PENDING');
    await addParticipant(joinDeclined.id, b!.id, 'DECLINED');
    // cancelled join still has approved participant for exclusion test
    await addParticipant(joinCancelled.id, b!.id, 'PENDING');

    console.log(
      JSON.stringify({
        ok: true,
        tag: TAG,
        userA: { id: a!.id.slice(0, 8), nick: a!.profile?.nickname },
        userB: { id: b!.id.slice(0, 8), nick: b!.profile?.nickname },
        joins: {
          h24: join24.id,
          h3: join3.id,
          declined: joinDeclined.id,
          cancelled: joinCancelled.id,
        },
        venue: venue.name,
        facilityId: venue.golfFacilityId,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
