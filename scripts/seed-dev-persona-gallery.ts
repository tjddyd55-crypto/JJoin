/**
 * DEV ONLY. Adds several photoreal gallery photos per investor-demo persona.
 *
 * Does not create users or joins. Refuses production.
 *
 *   JJOIN_APP_VARIANT=development pnpm exec tsx scripts/seed-dev-persona-gallery.ts
 *
 * Re-run after scripts/seed-investor-demo.ts, which still writes a single gallery row.
 */
import { PrismaClient } from '@prisma/client';
import {
  assertDevPersonaGallerySeedAllowed,
  buildDevPersonaGalleryObjectKeys,
  isDevPersonaAvatarObjectKey,
} from '../packages/domain/src/dev-persona-gallery.ts';

const TAG = '[DEV-PERSONA-GALLERY]';

async function main(): Promise<void> {
  assertDevPersonaGallerySeedAllowed({
    appVariant: process.env.JJOIN_APP_VARIANT,
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT,
  });
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL required');
  }

  const prisma = new PrismaClient();
  try {
    const targets = await collectDemoPersonaAvatars(prisma);
    if (targets.size === 0) {
      console.log(`${TAG} no investor-demo avatars found; nothing to update`);
      return;
    }

    for (const [userId, avatarKey] of targets) {
      const keys = buildDevPersonaGalleryObjectKeys(avatarKey);
      await prisma.userProfilePhoto.deleteMany({ where: { userId } });
      await prisma.userProfilePhoto.createMany({
        data: keys.map((objectKey, sortOrder) => ({
          userId,
          objectKey,
          sortOrder,
          isPrimary: sortOrder === 0,
        })),
      });
      console.log(`${TAG} user=${userId} photos=${keys.length}`);
    }
    console.log(`${TAG} updated ${targets.size} demo personas`);
  } finally {
    await prisma.$disconnect();
  }
}

async function collectDemoPersonaAvatars(prisma: PrismaClient): Promise<Map<string, string>> {
  const byUser = new Map<string, string>();
  const assets = await prisma.mediaAsset.findMany({
    where: { storageKey: { contains: 'investor-demo/' } },
    select: { ownerUserId: true, storageKey: true },
  });
  for (const asset of assets) {
    if (!isDevPersonaAvatarObjectKey(asset.storageKey)) continue;
    byUser.set(asset.ownerUserId, asset.storageKey.trim());
  }

  const photos = await prisma.userProfilePhoto.findMany({
    where: { objectKey: { contains: 'investor-demo/' } },
    select: { userId: true, objectKey: true },
  });
  for (const photo of photos) {
    if (byUser.has(photo.userId)) continue;
    if (!isDevPersonaAvatarObjectKey(photo.objectKey)) continue;
    byUser.set(photo.userId, photo.objectKey.trim());
  }
  return byUser;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'seed_failed';
  console.error(`${TAG} ${message}`);
  process.exitCode = 1;
});
