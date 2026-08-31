/**
 * DEV-only QA seed for push / reminder / analytics acceptance.
 * Tag: [QA-PUSH-REMINDER-ANALYTICS]
 *
 * Usage:
 *   DATABASE_URL=... pnpm exec tsx scripts/seed-push-reminder-analytics-qa.ts
 */
import { PrismaClient, ProductEventType } from '@prisma/client';

const TAG = '[QA-PUSH-REMINDER-ANALYTICS]';

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: {
        profile: { nickname: { contains: 'QA' } },
      },
      take: 2,
      select: { id: true, profile: { select: { nickname: true } } },
    });

    if (users.length < 2) {
      console.log(`${TAG} skip — need 2 QA users with nickname containing QA`);
      return;
    }

    const [userA, userB] = users;
    await prisma.notificationPreference.upsert({
      where: { userId: userA!.id },
      create: { userId: userA!.id },
      update: {},
    });
    await prisma.notificationPreference.upsert({
      where: { userId: userB!.id },
      create: {
        userId: userB!.id,
        urgentJoinEnabled: false,
        attendanceReminderEnabled: true,
      },
      update: {
        urgentJoinEnabled: false,
        attendanceReminderEnabled: true,
      },
    });

    await prisma.productEvent.createMany({
      data: [
        {
          eventType: ProductEventType.RECOMMENDATION_IMPRESSION,
          userId: userA!.id,
          source: 'seed',
          metadata: { tag: TAG },
        },
        {
          eventType: ProductEventType.RECOMMENDATION_CLICK,
          userId: userA!.id,
          source: 'seed',
          metadata: { tag: TAG },
        },
        {
          eventType: ProductEventType.SHARE_LINK_OPENED,
          source: 'seed',
          metadata: { tag: TAG },
        },
      ],
      skipDuplicates: true,
    });

    console.log(`${TAG} seeded preferences + sample events`, {
      userA: userA!.profile?.nickname,
      userB: userB!.profile?.nickname,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
