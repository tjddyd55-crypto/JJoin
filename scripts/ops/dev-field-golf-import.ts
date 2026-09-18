/**
 * DEV-only FIELD ODCloud import.
 *
 *   pnpm exec tsx scripts/ops/dev-field-golf-import.ts --sample
 *   pnpm exec tsx scripts/ops/dev-field-golf-import.ts --full
 *   pnpm exec tsx scripts/ops/dev-field-golf-import.ts --full --second-sync
 *
 * --second-sync runs the importer twice and prints idempotency deltas.
 */
import { PrismaClient } from '@prisma/client';
import { FieldGolfCourseSyncService } from '../../apps/api/src/modules/field-golf-courses/sync/field-golf-course-sync.service.ts';
import {
  assertDevDatabase,
  resolveFieldOdcloudServiceKey,
} from '../lib/assert-dev-database.ts';

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  assertDevDatabase('[DEV-FIELD-GOLF-IMPORT]');
  const sample = hasFlag('--sample') || !hasFlag('--full');
  const secondSync = hasFlag('--second-sync');
  const serviceKey = resolveFieldOdcloudServiceKey();
  const prisma = new PrismaClient();
  const sync = new FieldGolfCourseSyncService(prisma);
  try {
    const first = await sync.run({
      serviceKey,
      force: true,
      maxPages: sample ? 1 : undefined,
    });
    console.log('field_golf_import_first', JSON.stringify(first));
    if (first.status !== 'SUCCESS') {
      process.exitCode = 1;
      return;
    }
    if (secondSync) {
      const second = await sync.run({
        serviceKey,
        force: true,
        maxPages: sample ? 1 : undefined,
      });
      console.log('field_golf_import_second', JSON.stringify(second));
      const insertedOnSecond = second.insertedCount;
      console.log(
        'field_golf_import_idempotency',
        JSON.stringify({
          firstInserted: first.insertedCount,
          secondInserted: insertedOnSecond,
          secondUpdated: second.updatedCount,
          secondUnchanged: second.unchangedCount,
          pass: insertedOnSecond === 0,
        }),
      );
      if (insertedOnSecond !== 0) process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
