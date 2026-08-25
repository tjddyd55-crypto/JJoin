/**
 * Manual / Railway cron runner for nationwide LOCALDATA golf facility sync.
 *
 * Usage:
 *   pnpm exec tsx scripts/run-public-golf-facility-sync.ts
 *   pnpm exec tsx scripts/run-public-golf-facility-sync.ts --force
 *   pnpm exec tsx scripts/run-public-golf-facility-sync.ts --force --dry-run
 *
 * Calendar: without --force, runs only on KST day 1 or 16 (pair with UTC cron 0 19 * * *).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PublicGolfFacilitySyncService } from '../apps/api/src/modules/golf-facilities/sync/public-golf-facility-sync.service.ts';

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
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!serviceKey) {
    throw new Error('DATA_GO_KR_SERVICE_KEY missing');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL missing');
  }

  const prisma = new PrismaClient();
  const sync = new PublicGolfFacilitySyncService(prisma);
  try {
    const report = await sync.run({ serviceKey, force, dryRun });
    console.log('public_golf_facility_sync', JSON.stringify(report));
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
