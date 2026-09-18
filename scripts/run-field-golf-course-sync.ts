/**
 * Manual / Railway cron runner for ODCloud national golf-course (FIELD) sync.
 *
 * Usage:
 *   pnpm exec tsx scripts/run-field-golf-course-sync.ts
 *   pnpm exec tsx scripts/run-field-golf-course-sync.ts --force
 *   pnpm exec tsx scripts/run-field-golf-course-sync.ts --force --dry-run
 *   pnpm exec tsx scripts/run-field-golf-course-sync.ts --force --sample
 *
 * Calendar: without --force, runs only on KST day 1 or 16
 * (same gate as SCREEN public-golf sync; pair with UTC cron 0 19 * * *).
 */
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { FieldGolfCourseSyncService } from '../apps/api/src/modules/field-golf-courses/sync/field-golf-course-sync.service.ts';
import { resolveFieldOdcloudServiceKey } from './lib/assert-dev-database.ts';

dns.setDefaultResultOrder('ipv4first');

function loadEnvFiles() {
  const root = path.resolve(__dirname, '..');
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const i = trimmed.indexOf('=');
      const key = trimmed.slice(0, i);
      let value = trimmed.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFiles();
  const force = process.argv.includes('--force');
  const dryRun = process.argv.includes('--dry-run');
  const sample = process.argv.includes('--sample');
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL missing');
  }
  const serviceKey = resolveFieldOdcloudServiceKey();
  const prisma = new PrismaClient();
  const sync = new FieldGolfCourseSyncService(prisma);
  try {
    const report = await sync.run({
      serviceKey,
      force,
      dryRun,
      maxPages: sample ? 1 : undefined,
    });
    console.log('field_golf_course_sync', JSON.stringify(report));
    if (report.status === 'FAILED' || report.status === 'ABORTED_GUARD') {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
