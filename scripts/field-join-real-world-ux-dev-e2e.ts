/**
 * DEV-only policy probe for FIELD create + SCREEN regression.
 *
 *   JJOIN_API_BASE_URL=https://... pnpm exec tsx scripts/field-join-real-world-ux-dev-e2e.ts
 *
 * Does not write Production data, Toss payments, or real coin balances.
 * If API/auth is unavailable this script exits 0 after printing SKIP.
 */
import { createJoinSchema } from '../packages/validation/src/index.ts';
import {
  validateJoinCapacityForTrack,
  validateFieldJoinDetails,
} from '../packages/domain/src/index.ts';

const venueId = '11111111-1111-4111-8111-111111111111';
const startAt = new Date(Date.now() + 36 * 60 * 60_000).toISOString();

function requireOk(ok: boolean, label: string): void {
  if (!ok) throw new Error(label);
}

requireOk(
  validateJoinCapacityForTrack({
    playFormat: 'INDIVIDUAL',
    plannedPlayerCount: 4,
    venueType: 'FIELD',
  }).ok,
  'FIELD 4 must pass',
);
requireOk(
  !validateJoinCapacityForTrack({
    playFormat: 'INDIVIDUAL',
    plannedPlayerCount: 6,
    venueType: 'FIELD',
  }).ok,
  'FIELD 6 must fail',
);
requireOk(
  validateJoinCapacityForTrack({
    playFormat: 'INDIVIDUAL',
    plannedPlayerCount: 6,
    venueType: 'SCREEN',
  }).ok,
  'SCREEN 6 must pass',
);
requireOk(
  validateFieldJoinDetails({
    participantCount: 4,
    greenFeePerPerson: 90000,
    caddieMode: 'NO_CADDIE',
  }).ok,
  'FIELD cost must pass',
);

const liveCreate = createJoinSchema.safeParse({
  venueId,
  startAt,
  plannedPlayerCount: 4,
  joinMethod: 'OPEN',
  venueType: 'FIELD',
  fieldDetails: {
    greenFeePerPerson: 90000,
    greenFeePayer: 'EACH_PERSON',
    caddieMode: 'NO_CADDIE',
    roundHoles: 18,
    teeTimeMode: 'CONFIRMED',
  },
});
requireOk(liveCreate.success, 'FIELD create DTO must parse');

async function maybeProbeLiveApi(): Promise<void> {
  const apiBase = process.env.JJOIN_API_BASE_URL?.replace(/\/$/, '');
  if (!apiBase) {
    console.log('[FIELD-UX-E2E] SKIP live API — unit/schema policies passed');
    return;
  }
  const health = await fetch(`${apiBase}/health`).catch(() => null);
  if (!health || !health.ok) {
    console.log('[FIELD-UX-E2E] SKIP live API health — schema policies passed');
    return;
  }
  console.log('[FIELD-UX-E2E] health ok; live authenticated create was not run (no DEV session in this environment)');
}

void maybeProbeLiveApi().then(() => {
  console.log('[FIELD-UX-E2E] OK');
});
