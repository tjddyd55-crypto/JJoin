/**
 * Development-only QA seed for club management Phase 1.
 * Tag: [QA-CLUB-MGMT]
 */
import { randomUUID } from 'node:crypto';
import {
  ClubActivityType,
  ClubAgeGroup,
  ClubEventAttendanceResponse,
  ClubEventStatus,
  ClubEventType,
  ClubJoinMode,
  ClubMembershipRole,
  ClubMembershipStatus,
  ClubVisibility,
  PrismaClient,
} from '@prisma/client';

const TAG = '[QA-CLUB-MGMT]';
const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  console.log(`${TAG} seeding…`);

  const profiles = await prisma.userProfile.findMany({
    where: { nickname: { contains: 'DEV' } },
    take: 30,
  });
  if (profiles.length < 5) throw new Error('need >=5 DEV users');

  const oldClubs = await prisma.club.findMany({
    where: { name: { startsWith: TAG } },
    select: { id: true },
  });
  if (oldClubs.length) {
    const ids = oldClubs.map((c) => c.id);
    await prisma.clubAccountingEntry.deleteMany({ where: { clubId: { in: ids } } });
    await prisma.clubNotice.deleteMany({ where: { clubId: { in: ids } } });
    await prisma.clubEventAttendance.deleteMany({
      where: { clubEvent: { clubId: { in: ids } } },
    });
    await prisma.clubEvent.deleteMany({ where: { clubId: { in: ids } } });
    await prisma.clubMembership.deleteMany({ where: { clubId: { in: ids } } });
    await prisma.club.deleteMany({ where: { id: { in: ids } } });
    console.log(`${TAG} cleaned ${ids.length} old clubs`);
  }

  const owner = profiles[0]!;
  const members = profiles.slice(1, 26);

  const club = await prisma.club.create({
    data: {
      name: `${TAG} 일산 스크린 동호회`,
      coverImageUrl: 'https://picsum.photos/seed/jjoin-club/800/400',
      intro: 'DEV QA club for operations dashboard',
      region: '경기 고양',
      activityType: ClubActivityType.SCREEN_AND_FIELD,
      primaryVenueName: '가자 24시 스크린골프',
      joinMode: ClubJoinMode.APPROVAL,
      visibility: ClubVisibility.PUBLIC,
      primaryAgeGroup: ClubAgeGroup.FORTIES,
      ownerUserId: owner.userId,
    },
  });

  await prisma.clubMembership.create({
    data: {
      clubId: club.id,
      userId: owner.userId,
      role: ClubMembershipRole.OWNER,
      status: ClubMembershipStatus.ACTIVE,
      joinedAt: new Date(),
    },
  });

  for (const m of members) {
    await prisma.clubMembership.create({
      data: {
        clubId: club.id,
        userId: m.userId,
        role: m.userId === members[1]?.userId ? ClubMembershipRole.MANAGER : ClubMembershipRole.MEMBER,
        status: ClubMembershipStatus.ACTIVE,
        joinedAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60_000),
      },
    });
  }

  await prisma.clubMembership.create({
    data: {
      clubId: club.id,
      userId: profiles[26]?.userId ?? members[0]!.userId,
      role: ClubMembershipRole.MEMBER,
      status: ClubMembershipStatus.PENDING,
    },
  });

  const now = Date.now();
  const completedEvents = [];
  for (let i = 0; i < 8; i++) {
    const startsAt = new Date(now - (i + 10) * 7 * 24 * 60 * 60_000);
    const event = await prisma.clubEvent.create({
      data: {
        clubId: club.id,
        title: `${TAG} 완료 모임 ${i + 1}`,
        eventType: i % 2 === 0 ? ClubEventType.SCREEN : ClubEventType.FIELD,
        startsAt,
        venueName: 'QA 스크린골프',
        venueAddress: '경기 고양시 일산',
        capacity: 12,
        responseDeadline: new Date(startsAt.getTime() - 24 * 60 * 60_000),
        status: ClubEventStatus.COMPLETED,
        createdByUserId: owner.userId,
        attendanceFinalizedAt: new Date(startsAt.getTime() + 2 * 60 * 60_000),
      },
    });
    completedEvents.push(event);
  }

  for (const event of completedEvents) {
    for (const m of members) {
      const roll = Math.random();
      const response =
        roll < 0.55
          ? ClubEventAttendanceResponse.ATTENDING
          : roll < 0.75
            ? ClubEventAttendanceResponse.DECLINED
            : roll < 0.9
              ? ClubEventAttendanceResponse.MAYBE
              : ClubEventAttendanceResponse.NO_RESPONSE;
      const finalStatus =
        response === ClubEventAttendanceResponse.ATTENDING
          ? Math.random() < 0.85
            ? 'ATTENDED'
            : 'NO_SHOW'
          : null;
      await prisma.clubEventAttendance.create({
        data: {
          clubEventId: event.id,
          userId: m.userId,
          response,
          finalStatus,
          respondedAt: new Date(event.startsAt.getTime() - 12 * 60 * 60_000),
        },
      });
    }
  }

  for (let i = 0; i < 3; i++) {
    const startsAt = new Date(now + (i + 2) * 3 * 24 * 60 * 60_000);
    const event = await prisma.clubEvent.create({
      data: {
        clubId: club.id,
        title: `${TAG} 진행 모임 ${i + 1}`,
        eventType: ClubEventType.SCREEN,
        startsAt,
        venueName: '진행중 QA 장소',
        capacity: 8,
        responseDeadline: new Date(startsAt.getTime() - 24 * 60 * 60_000),
        status: ClubEventStatus.OPEN,
        createdByUserId: owner.userId,
      },
    });
    for (const m of members.slice(0, 12)) {
      await prisma.clubEventAttendance.create({
        data: {
          clubEventId: event.id,
          userId: m.userId,
          response:
            Math.random() < 0.5
              ? ClubEventAttendanceResponse.ATTENDING
              : ClubEventAttendanceResponse.NO_RESPONSE,
        },
      });
    }
  }

  await prisma.clubAccountingEntry.createMany({
    data: [
      {
        id: randomUUID(),
        clubId: club.id,
        entryType: 'INCOME',
        category: 'MEMBERSHIP_FEE',
        amount: '500000',
        entryDate: new Date(`${new Date().getFullYear()}-01-15`),
        memo: '연회비',
        createdByUserId: owner.userId,
      },
      {
        id: randomUUID(),
        clubId: club.id,
        entryType: 'EXPENSE',
        category: 'GAME_FEE',
        amount: '120000',
        entryDate: new Date(`${new Date().getFullYear()}-02-10`),
        memo: '2월 게임비',
        createdByUserId: owner.userId,
      },
    ],
  });

  await prisma.clubNotice.create({
    data: {
      clubId: club.id,
      title: `${TAG} 3월 정기 모임 안내`,
      body: 'DEV QA notice — club operations only.',
      pinned: true,
      sendPush: false,
      createdByUserId: owner.userId,
    },
  });

  const shortageEvent = await prisma.clubEvent.create({
    data: {
      clubId: club.id,
      title: `${TAG} 정원 부족 모임`,
      eventType: ClubEventType.SCREEN,
      startsAt: new Date(now + 5 * 24 * 60 * 60_000),
      venueName: '긴급 모집 QA 장소',
      capacity: 20,
      responseDeadline: new Date(now + 4 * 24 * 60 * 60_000),
      status: ClubEventStatus.OPEN,
      createdByUserId: owner.userId,
    },
  });

  for (const m of members.slice(0, 16)) {
    await prisma.clubEventAttendance.create({
      data: {
        clubEventId: shortageEvent.id,
        userId: m.userId,
        response: ClubEventAttendanceResponse.ATTENDING,
        respondedAt: new Date(),
      },
    });
  }

  await prisma.clubAccountingEntry.create({
    data: {
      clubId: club.id,
      clubEventId: completedEvents[0]?.id,
      entryType: 'EXPENSE',
      category: 'GAME_FEE',
      amount: '80000',
      entryDate: completedEvents[0]?.startsAt ?? new Date(),
      memo: '모임 연계 지출',
      createdByUserId: owner.userId,
    },
  });

  console.log(`${TAG} clubId=${club.id} owner=${owner.nickname} members=${members.length + 1} shortageEvent=${shortageEvent.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
