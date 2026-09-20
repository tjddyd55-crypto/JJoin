/**
 * Volume, copy-safety, schedule, and seed-path proofs for the DEV investor pack.
 * Run: pnpm exec tsx scripts/investor-demo-catalog.node-test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEMO_BANNERS,
  DEMO_CLUBS,
  DEMO_PERSONAS,
  DEMO_STORES,
  INVESTOR_DEMO_BATCH_VERSION,
  INVESTOR_DEMO_JOIN_KEY_PREFIX,
  buildJoinPlans,
  demoEmail,
  demoProviderSubject,
  joinIdempotencyKey,
  summarizeJoinPlans,
  validatePersonaCatalog,
  validateVenueCatalog,
} from './lib/investor-demo-catalog.ts';
import { assertSafeUiCopy } from './lib/investor-demo-copy.ts';
import { inspectDemoAssets, listRequiredDemoAssets } from './lib/investor-demo-assets.ts';
import {
  KST_OFFSET_MS,
  TODAY_FIELD_SLOT_MIN,
  TODAY_SCREEN_SLOT_MIN,
  buildFieldSlots,
  buildScreenSlots,
  countTodayListableSlots,
  isSameKstDay,
  kstParts,
  resolveDemoSlotEndAt,
} from './lib/investor-demo-schedule.ts';

validatePersonaCatalog();
validateVenueCatalog();

assert.equal(INVESTOR_DEMO_BATCH_VERSION, 'v2');
assert.ok(DEMO_PERSONAS.length >= 20 && DEMO_PERSONAS.length <= 40, `personas=${DEMO_PERSONAS.length}`);
assert.ok(DEMO_STORES.length >= 15 && DEMO_STORES.length <= 25, `stores=${DEMO_STORES.length}`);
assert.ok(DEMO_BANNERS.length >= 3 && DEMO_BANNERS.length <= 6, `banners=${DEMO_BANNERS.length}`);
assert.ok(DEMO_CLUBS.length >= 3 && DEMO_CLUBS.length <= 8, `clubs=${DEMO_CLUBS.length}`);

const now = new Date('2026-09-20T03:00:00.000Z'); // 12:00 KST Sunday
const plans = buildJoinPlans(now);
const summary = summarizeJoinPlans(plans);
assert.ok(summary.screenTotal >= 80 && summary.screenTotal <= 120, JSON.stringify(summary));
assert.ok(summary.fieldTotal >= 40 && summary.fieldTotal <= 70, JSON.stringify(summary));
assert.ok(summary.screenOpen >= 80, `screenOpen=${summary.screenOpen}`);
assert.ok(summary.fieldOpen >= 40, `fieldOpen=${summary.fieldOpen}`);
assert.ok((summary.buckets.tonight ?? 0) > 0, 'tonight slots');
assert.ok((summary.buckets.this_weekend ?? 0) > 0, 'weekend slots');
assert.ok((summary.buckets.next_weekday_evening ?? 0) > 0, 'weekday evening slots');

const twoWeeks = now.getTime() + 14 * 24 * 3600_000;
for (const plan of plans) {
  if (plan.status !== 'OPEN') continue;
  const endAt = plan.scheduledEndAt ?? resolveDemoSlotEndAt(plan.startAt, now);
  assert.ok(endAt.getTime() > now.getTime(), `ended open join ${plan.key}`);
  assert.ok(plan.startAt.getTime() <= twoWeeks + 24 * 3600_000, `beyond 2w ${plan.key} ${plan.startAt.toISOString()}`);
}

function countDiscoverableToday(source: typeof plans, clock: Date, track: 'SCREEN' | 'FIELD'): number {
  return source.filter((plan) => {
    if (plan.status !== 'OPEN' || plan.track !== track) return false;
    if (!isSameKstDay(plan.startAt, clock)) return false;
    return plan.scheduledEndAt.getTime() > clock.getTime();
  }).length;
}

assert.ok(countDiscoverableToday(plans, now, 'SCREEN') >= TODAY_SCREEN_SLOT_MIN, 'noon SCREEN today list');
assert.ok(countDiscoverableToday(plans, now, 'FIELD') >= TODAY_FIELD_SLOT_MIN, 'noon FIELD today list');

const late = new Date('2026-09-20T13:00:00.000Z'); // 22:00 KST Sunday
const lateScreen = buildScreenSlots(late);
const lateField = buildFieldSlots(late);
assert.ok(countTodayListableSlots(lateScreen, late) >= TODAY_SCREEN_SLOT_MIN, 'late SCREEN today slots');
assert.ok(countTodayListableSlots(lateField, late) >= TODAY_FIELD_SLOT_MIN, 'late FIELD today slots');
const latePlans = buildJoinPlans(late);
assert.ok(countDiscoverableToday(latePlans, late, 'SCREEN') >= TODAY_SCREEN_SLOT_MIN, 'late SCREEN today list');
assert.ok(countDiscoverableToday(latePlans, late, 'FIELD') >= TODAY_FIELD_SLOT_MIN, 'late FIELD today list');

const hostCompleted = new Map<string, number>();
const participateCompleted = new Map<string, number>();
for (const plan of plans) {
  if (plan.status !== 'COMPLETED') continue;
  hostCompleted.set(plan.host, (hostCompleted.get(plan.host) ?? 0) + 1);
  for (const slug of plan.completed) {
    participateCompleted.set(slug, (participateCompleted.get(slug) ?? 0) + 1);
  }
}
for (const persona of DEMO_PERSONAS) {
  assert.equal(hostCompleted.get(persona.slug) ?? 0, persona.hostCompleted, `host ${persona.slug}`);
  assert.equal(
    participateCompleted.get(persona.slug) ?? 0,
    persona.participateCompleted,
    `play ${persona.slug}`,
  );
}

for (const persona of DEMO_PERSONAS) {
  assert.match(demoProviderSubject(persona.slug), /^investor-demo-/);
  assert.match(demoEmail(persona.slug), /@jjoin\.zone\.demo$/);
}

for (const plan of plans) {
  assert.ok(joinIdempotencyKey(plan.key).startsWith(INVESTOR_DEMO_JOIN_KEY_PREFIX));
  assertSafeUiCopy(plan.title, plan.key);
  assertSafeUiCopy(plan.description, plan.key);
}

const screenSlots = buildScreenSlots(now);
const fieldSlots = buildFieldSlots(now);
assert.ok(screenSlots.length >= 10, `screenSlots=${screenSlots.length}`);
assert.ok(fieldSlots.length >= 8, `fieldSlots=${fieldSlots.length}`);
const parts = kstParts(now);
assert.equal(parts.hour, 12);
assert.equal(KST_OFFSET_MS, 9 * 3600_000);

const seedSource = readFileSync(join(process.cwd(), 'scripts/lib/investor-demo-seed.ts'), 'utf8');
assert.doesNotMatch(seedSource, /join-created-audience/);
assert.doesNotMatch(seedSource, /NotificationOutbox/);
assert.doesNotMatch(seedSource, /NotificationEventService/);
assert.doesNotMatch(seedSource, /joins\.service/);
assert.match(seedSource, /Prisma-only inserts/);
assert.match(seedSource, /Mass OPEN joins do not grant/);

const required = listRequiredDemoAssets();
assert.ok(required.length >= 20 + 15 + 3, `assets=${required.length}`);
for (const ref of required) {
  assert.match(ref.objectKey, /^development\/investor-demo\/v2\//);
  assert.doesNotMatch(ref.objectKey, /^production\//);
}
const assets = inspectDemoAssets();
assert.equal(assets.missing.length, 0, `missing assets ${assets.missing.join(',')}`);
assert.equal(assets.tooSmall.length, 0, `small assets ${assets.tooSmall.join(',')}`);
assert.equal(assets.present, assets.required);

const keyStores = DEMO_STORES.filter((row) => row.galleryCount >= 3);
assert.ok(keyStores.length >= 3, 'key stores with gallery');

console.log(
  'investor-demo-catalog.node-test PASS',
  JSON.stringify({
    personas: DEMO_PERSONAS.length,
    stores: DEMO_STORES.length,
    banners: DEMO_BANNERS.length,
    clubs: DEMO_CLUBS.length,
    ...summary,
    requiredAssets: required.length,
  }),
);
