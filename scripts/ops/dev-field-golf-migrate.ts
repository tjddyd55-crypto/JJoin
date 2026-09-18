/**
 * DEV-only additive Prisma migrate for SCREEN/FIELD Join.
 *
 *   pnpm exec tsx scripts/ops/dev-field-golf-migrate.ts
 *
 * Aborts if DATABASE_URL / Railway env looks like Production.
 */
import { spawnSync } from 'node:child_process';
import { assertDevDatabase } from '../lib/assert-dev-database.ts';

assertDevDatabase('[DEV-FIELD-GOLF-MIGRATE]');

const result = spawnSync(
  'pnpm',
  ['exec', 'prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma'],
  { stdio: 'inherit', env: process.env },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log('[DEV-FIELD-GOLF-MIGRATE] migrate deploy ok');
