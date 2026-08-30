/**
 * Development-only QA seed for attendance + chat loop.
 * Tag: [QA-JOIN-ATTENDANCE-CHAT]
 *
 * Requires DATABASE_URL (e.g. railway connect tunnel).
 */
import { randomUUID } from 'node:crypto';
import {
  AttendanceIntent,
  JoinChatMessageKind,
  JoinChatRoomStatus,
  JoinKind,
  JoinStatus,
  ParticipantRole,
  ParticipationStatus,
  PrismaClient,
} from '@prisma/client';
import { kstDayBoundsUtc, localDayKey } from '../packages/domain/src/index.ts';

const TAG = '[QA-JOIN-ATTENDANCE-CHAT]';
const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  console.log(`${TAG} seeding…`);

  const profiles = await prisma.userProfile.findMany({
    where: {
      nickname: {
        in: ['김진우_DEV_A', '박민수_DEV_B', 'QAUser', 'DevE2EUserㄴSeoul', '금치'],
      },
    },
    take: 6,
  });
  const extras = await prisma.userProfile.findMany({
    where: { nickname: { contains: 'DEV' } },
    take: 8,
  });
  const all = [...profiles, ...extras];
  const unique = new Map(all.map((p) => [p.userId, p]));
  const users = [...unique.values()];
  if (users.length < 3) throw new Error('need >=3 DEV users');

  const [host, a, b, c, outsider] = [
    users[0],
    users[1],
    users[2],
    users[3] ?? users[0],
    users[4] ?? users[1],
  ];
  console.log(
    `${TAG} host=${host.nickname} A=${a.nickname} B=${b.nickname} C=${c.nickname} out=${outsider.nickname}`,
  );

  const sport = await prisma.sport.findFirst();
  const coin = await prisma.coinAsset.findFirst();
  if (!sport || !coin) throw new Error('sport/coin missing');

  // Cleanup previous QA
  const old = await prisma.join.findMany({
    where: { title: { startsWith: TAG } },
    select: { id: true },
  });
  if (old.length) {
    const ids = old.map((j) => j.id);
    await prisma.joinInvitation.deleteMany({ where: { joinId: { in: ids } } });
    await prisma.joinChatMessage.deleteMany({
      where: { room: { joinId: { in: ids } } },
    });
    await prisma.joinChatMember.deleteMany({
      where: { room: { joinId: { in: ids } } },
    });
    await prisma.joinChatRoom.deleteMany({ where: { joinId: { in: ids } } });
    await prisma.join.deleteMany({ where: { id: { in: ids } } });
    console.log(`${TAG} cleaned ${ids.length} old joins`);
  }

  let facility = await prisma.golfFacility.findFirst({
    where: {
      isActive: true,
      latitude: { not: null },
      governmentSourceKey: { startsWith: '[QA-JOIN-GROWTH]' },
    },
  });
  if (!facility) {
    facility = await prisma.golfFacility.findFirst({
      where: { isActive: true, latitude: { not: null } },
    });
  }
  if (!facility?.latitude || !facility.longitude) throw new Error('no facility');

  let venue = await prisma.venue.findFirst({
    where: { golfFacilityId: facility.id },
  });
  if (!venue) {
    venue = await prisma.venue.create({
      data: {
        id: randomUUID(),
        name: facility.displayName,
        region: [facility.sido, facility.sigungu].filter(Boolean).join(' ') || '서울',
        address: facility.roadAddress ?? 'QA',
        latitude: facility.latitude,
        longitude: facility.longitude,
        golfFacilityId: facility.id,
      },
    });
  }

  const todayKey = localDayKey(new Date());
  const { start: dayStart } = kstDayBoundsUtc(todayKey);
  let startAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
  if (localDayKey(startAt) !== todayKey) {
    // Keep “today” after late-night: park at 20:00 KST of todayKey
    startAt = new Date(dayStart.getTime() + 20 * 60 * 60 * 1000);
  }
  const endAt = new Date(startAt.getTime() + 4 * 60 * 60 * 1000);

  // A. Today join: 4 seats, 3 approved → urgent 1
  const urgentJoinId = randomUUID();
  await prisma.join.create({
    data: {
      id: urgentJoinId,
      sportId: sport.id,
      venueId: venue.id,
      hostUserId: host.userId,
      title: `${TAG} urgent vacancy`,
      status: JoinStatus.OPEN,
      joinKind: JoinKind.STANDARD,
      startAt,
      scheduledEndAt: endAt,
      plannedPlayerCount: 4,
      confirmedPlayerCount: 3,
      rewardPerParticipant: 0,
      coinAssetId: coin.id,
      roomCreationFeeAmount: 0,
      rewardHoldTotalAmount: 0,
      isUrgent: true,
      urgentSeats: 1,
      urgentUntil: startAt,
      participants: {
        create: [
          {
            id: randomUUID(),
            userId: host.userId,
            role: ParticipantRole.HOST,
            participationStatus: ParticipationStatus.APPROVED,
            attendanceIntent: AttendanceIntent.CONFIRMED,
            attendanceIntentAt: new Date(),
            approvedAt: new Date(),
          },
          {
            id: randomUUID(),
            userId: a.userId,
            role: ParticipantRole.PARTICIPANT,
            participationStatus: ParticipationStatus.APPROVED,
            attendanceIntent: AttendanceIntent.CONFIRMED,
            attendanceIntentAt: new Date(),
            approvedAt: new Date(),
          },
          {
            id: randomUUID(),
            userId: b.userId,
            role: ParticipantRole.PARTICIPANT,
            participationStatus: ParticipationStatus.APPROVED,
            attendanceIntent: AttendanceIntent.PENDING,
            approvedAt: new Date(),
          },
        ],
      },
    },
  });

  // B+C. Confirmed join with chat room + mixed attendance
  const chatJoinId = randomUUID();
  const roomId = randomUUID();
  await prisma.join.create({
    data: {
      id: chatJoinId,
      sportId: sport.id,
      venueId: venue.id,
      hostUserId: host.userId,
      title: `${TAG} chat confirmed`,
      status: JoinStatus.CONFIRMED,
      joinKind: JoinKind.STANDARD,
      startAt: new Date(startAt.getTime() + 60 * 60 * 1000),
      scheduledEndAt: new Date(endAt.getTime() + 60 * 60 * 1000),
      plannedPlayerCount: 4,
      confirmedPlayerCount: 3,
      confirmedAt: new Date(),
      rewardPerParticipant: 0,
      coinAssetId: coin.id,
      roomCreationFeeAmount: 0,
      rewardHoldTotalAmount: 0,
      participants: {
        create: [
          {
            id: randomUUID(),
            userId: host.userId,
            role: ParticipantRole.HOST,
            participationStatus: ParticipationStatus.APPROVED,
            attendanceIntent: AttendanceIntent.CONFIRMED,
            approvedAt: new Date(),
          },
          {
            id: randomUUID(),
            userId: a.userId,
            role: ParticipantRole.PARTICIPANT,
            participationStatus: ParticipationStatus.APPROVED,
            attendanceIntent: AttendanceIntent.CONFIRMED,
            approvedAt: new Date(),
          },
          {
            id: randomUUID(),
            userId: b.userId,
            role: ParticipantRole.PARTICIPANT,
            participationStatus: ParticipationStatus.APPROVED,
            attendanceIntent: AttendanceIntent.DECLINED,
            approvedAt: new Date(),
          },
          {
            id: randomUUID(),
            userId: c.userId,
            role: ParticipantRole.PARTICIPANT,
            participationStatus: ParticipationStatus.APPROVED,
            attendanceIntent: AttendanceIntent.PENDING,
            approvedAt: new Date(),
          },
        ],
      },
      chatRoom: {
        create: {
          id: roomId,
          status: JoinChatRoomStatus.ACTIVE,
          members: {
            create: [
              { id: randomUUID(), userId: host.userId },
              { id: randomUUID(), userId: a.userId },
              // B declined — not in chat
              { id: randomUUID(), userId: c.userId },
            ],
          },
          messages: {
            create: [
              {
                id: randomUUID(),
                kind: JoinChatMessageKind.SYSTEM,
                body: '조인 채팅방이 열렸습니다.',
              },
              {
                id: randomUUID(),
                kind: JoinChatMessageKind.TEXT,
                senderUserId: host.userId,
                body: '안녕하세요, 몇 번 방인가요?',
              },
              {
                id: randomUUID(),
                kind: JoinChatMessageKind.TEXT,
                senderUserId: a.userId,
                body: '10분 정도 늦을 것 같아요',
              },
            ],
          },
        },
      },
    },
  });

  // D. Past completed joins for played-together (A-B x3, A-C x1, A-D NO_SHOW only)
  const pastBase = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  async function completedJoin(
    title: string,
    members: { userId: string; status: ParticipationStatus }[],
    daysAgo: number,
  ) {
    const s = new Date(pastBase.getTime() - daysAgo * 86400000);
    const e = new Date(s.getTime() + 2 * 3600000);
    await prisma.join.create({
      data: {
        id: randomUUID(),
        sportId: sport.id,
        venueId: venue.id,
        hostUserId: host.userId,
        title: `${TAG} ${title}`,
        status: JoinStatus.COMPLETED,
        joinKind: JoinKind.STANDARD,
        startAt: s,
        scheduledEndAt: e,
        plannedPlayerCount: members.length,
        confirmedPlayerCount: members.filter((m) => m.status === ParticipationStatus.COMPLETED)
          .length,
        rewardPerParticipant: 0,
        coinAssetId: coin.id,
        roomCreationFeeAmount: 0,
        rewardHoldTotalAmount: 0,
        participants: {
          create: members.map((m) => ({
            id: randomUUID(),
            userId: m.userId,
            role:
              m.userId === host.userId ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT,
            participationStatus: m.status,
            approvedAt: s,
          })),
        },
      },
    });
  }

  for (let i = 0; i < 3; i++) {
    await completedJoin(`played A-B #${i + 1}`, [
      { userId: host.userId, status: ParticipationStatus.COMPLETED },
      { userId: a.userId, status: ParticipationStatus.COMPLETED },
      { userId: b.userId, status: ParticipationStatus.COMPLETED },
    ], i + 1);
  }
  await completedJoin('played A-C', [
    { userId: host.userId, status: ParticipationStatus.COMPLETED },
    { userId: a.userId, status: ParticipationStatus.COMPLETED },
    { userId: c.userId, status: ParticipationStatus.COMPLETED },
  ], 4);
  await completedJoin('NO_SHOW only A-D', [
    { userId: host.userId, status: ParticipationStatus.COMPLETED },
    { userId: a.userId, status: ParticipationStatus.COMPLETED },
    { userId: outsider.userId, status: ParticipationStatus.NO_SHOW },
  ], 5);

  // F. New open join for re-invite
  const inviteJoinId = randomUUID();
  await prisma.join.create({
    data: {
      id: inviteJoinId,
      sportId: sport.id,
      venueId: venue.id,
      hostUserId: a.userId,
      title: `${TAG} reinvite target`,
      status: JoinStatus.OPEN,
      joinKind: JoinKind.STANDARD,
      startAt: new Date(startAt.getTime() + 2 * 3600000),
      scheduledEndAt: new Date(endAt.getTime() + 2 * 3600000),
      plannedPlayerCount: 4,
      confirmedPlayerCount: 1,
      rewardPerParticipant: 0,
      coinAssetId: coin.id,
      roomCreationFeeAmount: 0,
      rewardHoldTotalAmount: 0,
      participants: {
        create: [
          {
            id: randomUUID(),
            userId: a.userId,
            role: ParticipantRole.HOST,
            participationStatus: ParticipationStatus.APPROVED,
            approvedAt: new Date(),
          },
        ],
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        tag: TAG,
        urgentJoinId,
        chatJoinId,
        inviteJoinId,
        facilityId: facility.id,
        venueId: venue.id,
        hostUserId: host.userId,
        userA: a.userId,
        userB: b.userId,
        userC: c.userId,
        outsider: outsider.userId,
      },
      null,
      2,
    ),
  );
  console.log(`${TAG} done`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
