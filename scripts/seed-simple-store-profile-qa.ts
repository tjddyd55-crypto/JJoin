/**
 * DEV QA seed for simple screen venue profile.
 * Tag: [QA-SIMPLE-STORE-PROFILE]
 *
 * Usage:
 *   railway run -s api -e development -- pnpm exec tsx scripts/seed-simple-store-profile-qa.ts
 */
import { randomUUID } from 'node:crypto';
import { PrismaClient, StoreOwnershipStatus } from '@prisma/client';

const TAG = '[QA-SIMPLE-STORE-PROFILE]';
const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  console.log(`${TAG} seeding…`);

  const ownership = await prisma.storeOwnership.findFirst({
    where: { status: StoreOwnershipStatus.ACTIVE },
    include: { golfFacility: true, storeProfile: true },
    orderBy: { approvedAt: 'desc' },
  });
  if (!ownership) throw new Error('need ACTIVE store ownership');

  const profileId = ownership.storeProfile?.id ?? randomUUID();
  await prisma.storeProfile.upsert({
    where: { ownershipId: ownership.id },
    create: {
      id: profileId,
      ownershipId: ownership.id,
      visibility: 'PUBLIC',
      intro: `${TAG} 골프존 파크 테스트 매장입니다. 쾌적한 룸과 좌타석을 제공합니다.`,
      screenBrand: 'GOLFZON',
      screenModel: '투비전NX',
      roomCount: 8,
      phone: '031-123-4567',
      reservationLabel: '네이버 예약',
      reservationUrl: 'https://booking.naver.com/booking/example',
      reservationNote: '전화 예약도 가능합니다.',
      parkingAvailable: true,
      parkingNote: '건물 지하주차장 이용',
      leftHandedAvailable: true,
      unmanned: false,
    },
    update: {
      visibility: 'PUBLIC',
      intro: `${TAG} 골프존 파크 테스트 매장입니다. 쾌적한 룸과 좌타석을 제공합니다.`,
      screenBrand: 'GOLFZON',
      screenModel: '투비전NX',
      roomCount: 8,
      phone: '031-123-4567',
      reservationLabel: '네이버 예약',
      reservationUrl: 'https://booking.naver.com/booking/example',
      reservationNote: '전화 예약도 가능합니다.',
      parkingAvailable: true,
      parkingNote: '건물 지하주차장 이용',
      leftHandedAvailable: true,
      unmanned: false,
    },
  });

  const profile = await prisma.storeProfile.findUniqueOrThrow({
    where: { ownershipId: ownership.id },
  });

  await prisma.storeOperatingHours.deleteMany({ where: { profileId: profile.id } });
  await prisma.storeOperatingHours.createMany({
    data: [
      {
        id: randomUUID(),
        profileId: profile.id,
        dayGroup: 'WEEKDAY',
        startTime: '09:00',
        endTime: '24:00',
        sortOrder: 0,
      },
      {
        id: randomUUID(),
        profileId: profile.id,
        dayGroup: 'WEEKEND',
        startTime: '08:00',
        endTime: '24:00',
        sortOrder: 1,
      },
    ],
  });

  await prisma.storePriceSlot.deleteMany({ where: { profileId: profile.id } });
  await prisma.storePriceSlot.createMany({
    data: [
      { id: randomUUID(), profileId: profile.id, dayType: 'WEEKDAY', startTime: '07:00', endTime: '12:00', price: 15000, sortOrder: 0 },
      { id: randomUUID(), profileId: profile.id, dayType: 'WEEKDAY', startTime: '12:00', endTime: '18:00', price: 18000, sortOrder: 1 },
      { id: randomUUID(), profileId: profile.id, dayType: 'WEEKDAY', startTime: '18:00', endTime: '24:00', price: 22000, sortOrder: 2 },
      { id: randomUUID(), profileId: profile.id, dayType: 'WEEKEND', startTime: '07:00', endTime: '12:00', price: 22000, sortOrder: 0 },
      { id: randomUUID(), profileId: profile.id, dayType: 'WEEKEND', startTime: '12:00', endTime: '24:00', price: 25000, sortOrder: 1 },
    ],
  });

  console.log(`${TAG} done ownershipId=${ownership.id} name=${ownership.golfFacility.displayName}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
