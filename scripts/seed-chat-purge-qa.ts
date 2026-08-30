/**
 * Seed an expired join-chat room for Development purge scheduler verification.
 * Tag: [QA-CHAT-PURGE]
 *
 * Does NOT delete Join / participation history fixtures used by other QA.
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const TAG = '[QA-CHAT-PURGE]';
const prisma = new PrismaClient();

async function main() {
  const host = await prisma.user.findFirst({
    where: { profile: { nickname: 'DevE2EUserㄴSeoul' } },
    include: { profile: true },
  });
  if (!host) throw new Error('host DevE2EUserㄴSeoul not found');

  const sport = await prisma.sport.findFirst({ where: { code: 'SCREEN_GOLF' } });
  if (!sport) throw new Error('SCREEN_GOLF sport missing');

  let venue = await prisma.venue.findFirst({
    where: { name: { contains: 'QA-JOIN-GROWTH' } },
  });
  if (!venue) {
    venue = await prisma.venue.findFirst({ orderBy: { createdAt: 'desc' } });
  }
  if (!venue) throw new Error('no venue');

  const coin = await prisma.coinAsset.findFirst();
  if (!coin) throw new Error('no coin asset');

  // Clean prior purge QA joins' chat only (keep join rows for history proof).
  const prior = await prisma.join.findMany({
    where: { title: { startsWith: TAG } },
    select: { id: true, chatRoom: { select: { id: true } } },
  });
  for (const j of prior) {
    if (j.chatRoom) {
      await prisma.joinChatMessage.deleteMany({ where: { roomId: j.chatRoom.id } });
      await prisma.joinChatMember.deleteMany({ where: { roomId: j.chatRoom.id } });
      await prisma.joinChatRoom.delete({ where: { id: j.chatRoom.id } });
    }
  }

  const joinId = randomUUID();
  const startAt = new Date(Date.now() - 3 * 60 * 60_000);
  const scheduledEndAt = new Date(Date.now() - 2 * 60 * 60_000);
  const hideAfter = new Date(Date.now() - 60_000);
  const purgeAfter = new Date(Date.now() - 30_000);

  await prisma.join.create({
    data: {
      id: joinId,
      sportId: sport.id,
      venueId: venue.id,
      hostUserId: host.id,
      title: `${TAG} expired chat`,
      status: 'COMPLETED',
      joinMethod: 'OPEN',
      startAt,
      scheduledEndAt,
      plannedPlayerCount: 2,
      confirmedPlayerCount: 1,
      rewardPerParticipant: 0,
      roomCreationFeeAmount: 0,
      rewardHoldTotalAmount: 0,
      coinAssetId: coin.id,
      participants: {
        create: [
          {
            userId: host.id,
            role: 'HOST',
            participationStatus: 'COMPLETED',
            attendanceIntent: 'CONFIRMED',
            attendanceIntentAt: startAt,
            approvedAt: startAt,
          },
        ],
      },
    },
  });

  const room = await prisma.joinChatRoom.create({
    data: {
      joinId,
      status: 'READ_ONLY',
      hideAfter,
      purgeAfter,
    },
  });

  await prisma.joinChatMember.create({
    data: { roomId: room.id, userId: host.id },
  });
  await prisma.joinChatMessage.createMany({
    data: [
      {
        roomId: room.id,
        senderUserId: null,
        kind: 'SYSTEM',
        body: '조인이 종료되어 채팅이 읽기 전용으로 전환되었습니다.',
      },
      {
        roomId: room.id,
        senderUserId: host.id,
        kind: 'TEXT',
        body: `${TAG} message to purge`,
      },
    ],
  });

  console.log(
    JSON.stringify(
      {
        joinId,
        roomId: room.id,
        hideAfter: hideAfter.toISOString(),
        purgeAfter: purgeAfter.toISOString(),
        note: 'Wait for chat-purge-cron (or pnpm chat-purge worker) — do not POST purge-run manually for acceptance.',
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
