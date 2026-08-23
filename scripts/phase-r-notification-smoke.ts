/**
 * Phase R — notification outbox / device registration smoke (server-side).
 * Does not require FCM. Use PUSH_PROVIDER=null for delivery isolation.
 *
 * Usage: pnpm exec tsx scripts/phase-r-notification-smoke.ts
 */
import {
  NotificationType,
  PrismaClient,
  PushPlatform,
  PushProviderKind,
} from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_BASE_URL ?? 'https://api-production-2d67e.up.railway.app';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const host = await prisma.user.findFirst({
    where: { profile: { nickname: '김진우' } },
  });
  const guest = await prisma.user.findFirst({
    where: { profile: { nickname: '박민수' } },
  });
  assert(host && guest, 'DEV_A/DEV_B personas required');

  const eventKey = `smoke:r:${Date.now()}:join-application`;
  const notification = await prisma.appNotification.create({
    data: {
      userId: host.id,
      type: NotificationType.JOIN_APPLICATION_RECEIVED,
      title: '새 참가 신청',
      body: '스모크 참가자가 조인 참가를 신청했습니다.',
      data: {
        type: NotificationType.JOIN_APPLICATION_RECEIVED,
        joinId: '00000000-0000-4000-8000-000000000001',
      },
      eventKey,
    },
  });
  await prisma.notificationOutbox.create({
    data: { notificationId: notification.id },
  });

  let duplicateRejected = false;
  try {
    await prisma.appNotification.create({
      data: {
        userId: host.id,
        type: NotificationType.JOIN_APPLICATION_RECEIVED,
        title: 'dup',
        body: 'dup',
        data: {},
        eventKey,
      },
    });
  } catch (e) {
    duplicateRejected =
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: string }).code === 'P2002';
  }
  assert(duplicateRejected, 'eventKey unique must reject duplicates');

  const token = `ExponentPushToken[smoke-${Date.now()}]`;
  await prisma.pushDevice.upsert({
    where: { pushToken: token },
    create: {
      userId: host.id,
      pushToken: token,
      platform: PushPlatform.ANDROID,
      provider: PushProviderKind.EXPO,
      active: true,
    },
    update: { userId: host.id, active: true },
  });

  await prisma.pushDevice.update({
    where: { pushToken: token },
    data: { active: false },
  });

  const switched = await prisma.pushDevice.upsert({
    where: { pushToken: token },
    create: {
      userId: guest.id,
      pushToken: token,
      platform: PushPlatform.ANDROID,
      provider: PushProviderKind.EXPO,
      active: true,
    },
    update: { userId: guest.id, active: true },
  });
  assert(switched.userId === guest.id, 'account switch must reassign token ownership');

  const health = await fetch(`${API}/health`).then((r) => r.json());
  assert(
    (health as { status?: string }).status === 'ok' ||
      (health as { ok?: boolean }).ok === true,
    'api health',
  );

  let meta: unknown = null;
  try {
    meta = await fetch(`${API}/notifications/_meta`).then((r) => r.json());
  } catch {
    meta = { skipped: true };
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        notificationId: notification.id,
        deviceReassignedTo: switched.userId,
        health,
        meta,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
