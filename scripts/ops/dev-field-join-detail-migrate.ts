/**
 * DEV-only additive Prisma migrate for FieldJoinDetail (KRW cost / round holes).
 *
 *   pnpm exec tsx scripts/ops/dev-field-join-detail-migrate.ts
 *
 * Aborts if DATABASE_URL / Railway env looks like Production.
 * Does not write Coin ledger rows or adjust real user balances.
 */
import { spawnSync } from 'node:child_process';
import { assertDevDatabase } from '../lib/assert-dev-database.ts';

assertDevDatabase('[DEV-FIELD-JOIN-DETAIL-MIGRATE]');

const result = spawnSync(
  'pnpm',
  ['exec', 'prisma', 'migrate', 'deploy', '--schema=prisma/schema.prisma'],
  { stdio: 'inherit', env: process.env },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log('[DEV-FIELD-JOIN-DETAIL-MIGRATE] migrate deploy ok');
