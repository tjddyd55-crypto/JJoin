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
  DEMO_HOME_NEARBY_PROBES,
  DEMO_HOME_NEARBY_RADIUS_METERS,
  DEMO_JAMSIL_HOME_ANCHOR,
  DEMO_TODAY_FIELD_SLUGS,
  DEMO_TODAY_SCREEN_SLUGS,
  DEMO_TODAY_SCREEN_VENUES,
  haversineMetersDemo,
  resolveFieldJoinCoords,
  resolveScreenJoinCoords,
  buildJoinPlans,
  countTodayDiscoverablePlans,
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
  DEMO_ONGOING_MIN_REMAINING_MS,
  TODAY_FIELD_SLOT_MIN,
  TODAY_SCREEN_SLOT_MIN,
  buildFieldSlots,
  buildScreenSlots,
  countTodayListableSlots,
  kstParts,
  resolveDemoSlotEndAt,
} from './lib/investor-demo-schedule.ts';

validatePersonaCatalog();
validateVenueCatalog();

const jamsilScreen = DEMO_TODAY_SCREEN_VENUES.find((row) => row.slug === 'jamsil');
assert.ok(jamsilScreen);
assert.equal(jamsilScreen.lat, DEMO_JAMSIL_HOME_ANCHOR.lat);
assert.equal(jamsilScreen.lng, DEMO_JAMSIL_HOME_ANCHOR.lng);
for (const slug of DEMO_TODAY_FIELD_SLUGS) {
  const field = resolveFieldJoinCoords({ courseSlug: slug });
  assert.ok(field, `today field hub missing ${slug}`);
  const meters = haversineMetersDemo(
    DEMO_JAMSIL_HOME_ANCHOR.lat,
    DEMO_JAMSIL_HOME_ANCHOR.lng,
    field.lat,
    field.lng,
  );
  assert.ok(meters <= DEMO_HOME_NEARBY_RADIUS_METERS, `FIELD ${slug} ${Math.round(meters)}m from Jamsil`);
}
assert.deepEqual(DEMO_TODAY_FIELD_SLUGS, ['jamsil-hub', 'songpa-hub', 'seolleung-hub', 'gangnam-hub']);

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

assert.ok(countTodayDiscoverablePlans(plans, now, 'SCREEN') >= TODAY_SCREEN_SLOT_MIN, 'noon SCREEN today list');
assert.ok(countTodayDiscoverablePlans(plans, now, 'FIELD') >= TODAY_FIELD_SLOT_MIN, 'noon FIELD today list');

const lateClocks = [
  new Date('2026-09-20T13:00:00.000Z'), // 22:00 KST
  new Date('2026-09-20T14:00:00.000Z'), // 23:00 KST — live DEV seed clock
];
for (const late of lateClocks) {
  const lateScreen = buildScreenSlots(late);
  const lateField = buildFieldSlots(late);
  assert.ok(countTodayListableSlots(lateScreen, late) >= TODAY_SCREEN_SLOT_MIN, `late SCREEN slots ${late.toISOString()}`);
  assert.ok(countTodayListableSlots(lateField, late) >= TODAY_FIELD_SLOT_MIN, `late FIELD slots ${late.toISOString()}`);
  const latePlans = buildJoinPlans(late);
  assert.ok(countTodayDiscoverablePlans(latePlans, late, 'SCREEN') >= TODAY_SCREEN_SLOT_MIN, `late SCREEN list ${late.toISOString()}`);
  assert.ok(countTodayDiscoverablePlans(latePlans, late, 'FIELD') >= TODAY_FIELD_SLOT_MIN, `late FIELD list ${late.toISOString()}`);
  for (const plan of latePlans) {
    if (plan.status !== 'OPEN' || plan.bucket !== 'today_ongoing') continue;
    assert.ok(
      plan.scheduledEndAt.getTime() - late.getTime() >= DEMO_ONGOING_MIN_REMAINING_MS,
      `ongoing remaining ${plan.key}`,
    );
  }
  const todayScreen = latePlans.filter((plan) => plan.track === 'SCREEN' && plan.key.startsWith('screen-today-'));
  assert.ok(todayScreen.every((plan) => DEMO_TODAY_SCREEN_SLUGS.includes(plan.storeSlug as string)));
  const todayField = latePlans.filter((plan) => plan.track === 'FIELD' && plan.key.startsWith('field-today-'));
  assert.equal(todayField.length, TODAY_FIELD_SLOT_MIN, `late FIELD today count ${late.toISOString()}`);
  assert.ok(todayField.every((plan) => plan.courseSlug && DEMO_TODAY_FIELD_SLUGS.includes(plan.courseSlug)));
  assert.ok(todayField.every((plan) => plan.confirmed.length + 1 < plan.plannedPlayerCount));
  for (const probe of DEMO_HOME_NEARBY_PROBES) {
    const screenNear = todayScreen.filter((plan) => {
      const coords = resolveScreenJoinCoords(plan.storeSlug);
      return coords != null && haversineMetersDemo(probe.lat, probe.lng, coords.lat, coords.lng) <= DEMO_HOME_NEARBY_RADIUS_METERS;
    });
    const fieldNear = todayField.filter((plan) => {
      const coords = resolveFieldJoinCoords({
        courseSlug: plan.courseSlug,
        fieldIndex: plan.fieldIndex,
      });
      return coords != null && haversineMetersDemo(probe.lat, probe.lng, coords.lat, coords.lng) <= DEMO_HOME_NEARBY_RADIUS_METERS;
    });
    assert.ok(screenNear.length >= 1, `home NEARBY SCREEN empty at ${probe.id}`);
    assert.ok(fieldNear.length >= 1, `home NEARBY FIELD empty at ${probe.id}`);
  }
}

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
assert.doesNotMatch(seedSource, /clubsUiEnabled:\s*true/);
assert.match(seedSource, /clubsUiEnabled:\s*DEFAULT_FEATURE_FLAGS\.clubsUiEnabled/);

const resetSource = readFileSync(join(process.cwd(), 'scripts/lib/investor-demo-reset.ts'), 'utf8');
assert.match(resetSource, /hostUserId: \{ in: userIds \}/);
assert.match(resetSource, /collectHostedJoinIds/);
assert.match(resetSource, /sweepHostedJoins/);
assert.match(resetSource, /joinParticipant\.deleteMany/);
assert.match(resetSource, /fieldJoinDetail\.deleteMany/);
assert.match(resetSource, /hosted_joins_remain/);
assert.ok(
  resetSource.indexOf('sweepHostedJoins') < resetSource.indexOf('deleteDemoUsers'),
  'hosted joins must be deleted before users',
);

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
