import { JoinStatus } from '@prisma/client';
import {
  FIELD_JOIN_BODIES,
  FIELD_JOIN_TITLES,
  SCREEN_JOIN_BODIES,
  SCREEN_JOIN_TITLES,
  assertSafeUiCopy,
  hashKey,
  pickFromPool,
} from './investor-demo-copy.ts';
import {
  DEMO_PERSONAS,
  listHostSlugs,
  listPlayerSlugs,
  type DemoPersonaSlug,
} from './investor-demo-personas.ts';
import { DEMO_STORES } from './investor-demo-venues.ts';
import { buildFieldSlots, buildScreenSlots, cycleSlots, type TimeBucket } from './investor-demo-schedule.ts';

export const INVESTOR_DEMO_BATCH_VERSION = 'v2';
export const INVESTOR_DEMO_JOIN_KEY_PREFIX = `investor-demo:${INVESTOR_DEMO_BATCH_VERSION}:`;

export const SCREEN_OPEN_TARGET = 96;
export const FIELD_OPEN_TARGET = 48;

export type JoinCondition = {
  preferredGender: 'ANY' | 'MALE' | 'FEMALE';
  minAge: number | null;
  maxAge: number | null;
  participantSkillMode: 'ANY' | 'BEGINNER_OK' | 'HANDICAP_RANGE';
  minScreenHandicap: number | null;
  maxScreenHandicap: number | null;
  gameStyle: 'FRIENDLY' | 'LIGHT_GAME' | 'DECIDE_ON_SITE';
  afterPlan: 'NONE' | 'MEAL_OR_DRINK' | 'DECIDE_ON_SITE';
};

export type DemoJoinPlan = {
  key: string;
  title: string;
  description: string;
  track: 'SCREEN' | 'FIELD';
  status: JoinStatus;
  host: DemoPersonaSlug;
  completed: DemoPersonaSlug[];
  confirmed: DemoPersonaSlug[];
  startAt: Date;
  plannedPlayerCount: number;
  storeSlug?: string;
  fieldIndex?: number;
  bucket?: TimeBucket;
  isUrgent?: boolean;
  greenFeePerPerson?: number;
  condition: JoinCondition;
};

const CAPACITIES = [2, 3, 4, 4, 4, 3] as const;
const GREEN_FEES = [95_000, 110_000, 130_000, 145_000, 160_000, 175_000] as const;

function pickCapacity(key: string): number {
  return CAPACITIES[hashKey(key) % CAPACITIES.length]!;
}

function occupancyConfirmed(key: string, capacity: number, host: DemoPersonaSlug): DemoPersonaSlug[] {
  const players = listPlayerSlugs().filter((slug) => slug !== host);
  const roll = hashKey(`${key}:occ`) % 100;
  let extra = 1;
  if (roll < 12) extra = 0;
  else if (roll < 55) extra = Math.min(1, capacity - 1);
  else if (roll < 88) extra = Math.max(1, capacity - 2);
  else extra = Math.max(0, capacity - 1);
  extra = Math.min(extra, capacity - 1, players.length);
  const start = hashKey(`${key}:roster`) % players.length;
  return Array.from({ length: extra }, (_, i) => players[(start + i) % players.length]!);
}

function pickHost(key: string, prefer?: DemoPersonaSlug[]): DemoPersonaSlug {
  const pool = prefer && prefer.length > 0 ? prefer : listHostSlugs();
  return pool[hashKey(`${key}:host`) % pool.length]!;
}

function pickStore(key: string): string {
  return DEMO_STORES[hashKey(`${key}:store`) % DEMO_STORES.length]!.slug;
}

function pickCondition(key: string, track: 'SCREEN' | 'FIELD'): JoinCondition {
  const roll = hashKey(`${key}:cond`) % 100;
  const condition: JoinCondition = {
    preferredGender: 'ANY',
    minAge: null,
    maxAge: null,
    participantSkillMode: 'ANY',
    minScreenHandicap: null,
    maxScreenHandicap: null,
    gameStyle: pickFromPool(['FRIENDLY', 'LIGHT_GAME', 'DECIDE_ON_SITE'] as const, `${key}:style`),
    afterPlan: pickFromPool(['NONE', 'MEAL_OR_DRINK', 'DECIDE_ON_SITE'] as const, `${key}:after`),
  };
  if (roll < 8) condition.preferredGender = 'MALE';
  else if (roll < 14) condition.preferredGender = 'FEMALE';
  if (roll >= 20 && roll < 28) {
    condition.minAge = 20;
    condition.maxAge = 39;
  } else if (roll >= 28 && roll < 33) {
    condition.minAge = 30;
    condition.maxAge = 49;
  }
  if (roll >= 40 && roll < 52) condition.participantSkillMode = 'BEGINNER_OK';
  if (track === 'SCREEN' && roll >= 70 && roll < 78) {
    condition.participantSkillMode = 'HANDICAP_RANGE';
    condition.minScreenHandicap = 0;
    condition.maxScreenHandicap = 20;
  }
  return condition;
}

function screenTitle(key: string, storeSlug: string): string {
  const store = DEMO_STORES.find((row) => row.slug === storeSlug);
  const phrase = pickFromPool(SCREEN_JOIN_TITLES, key);
  if (hashKey(`${key}:title`) % 3 === 0 && store) {
    return `${store.sigungu.replace(/시$|구$/, '')} ${phrase}`;
  }
  return phrase;
}

function fieldTitle(key: string): string {
  return pickFromPool(FIELD_JOIN_TITLES, key);
}

export function buildHistoryJoinPlans(now: Date): DemoJoinPlan[] {
  const plans: DemoJoinPlan[] = [];
  const past = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600_000);
  const historyCondition = pickCondition('history', 'SCREEN');

  for (let i = 0; i < 5; i += 1) {
    plans.push({
      key: `screen-completed-${i + 1}`,
      title: screenTitle(`screen-completed-${i + 1}`, 'gangnam'),
      description: pickFromPool(SCREEN_JOIN_BODIES, `screen-completed-${i + 1}`),
      track: 'SCREEN',
      status: JoinStatus.COMPLETED,
      host: 'hajun',
      completed: i < 2 ? ['seoa', 'yerin'] : ['seoa'],
      confirmed: [],
      startAt: past(24 * (3 + i * 2) + 19),
      plannedPlayerCount: 4,
      storeSlug: 'gangnam',
      condition: historyCondition,
    });
  }

  const fieldCompleted: DemoPersonaSlug[][] = [
    ['hajun', 'jihu', 'minjae'],
    ['jihu', 'minjae'],
    ['haneul'],
    ['haneul'],
    ['haneul'],
  ];
  for (let i = 0; i < 5; i += 1) {
    plans.push({
      key: `field-completed-${i + 1}`,
      title: fieldTitle(`field-completed-${i + 1}`),
      description: pickFromPool(FIELD_JOIN_BODIES, `field-completed-${i + 1}`),
      track: 'FIELD',
      status: JoinStatus.COMPLETED,
      host: 'taehyun',
      completed: fieldCompleted[i] ?? [],
      confirmed: [],
      startAt: past(24 * (4 + i * 2) + 8),
      plannedPlayerCount: 4,
      fieldIndex: i % 3,
      greenFeePerPerson: 140_000,
      condition: pickCondition(`field-completed-${i + 1}`, 'FIELD'),
    });
  }

  plans.push({
    key: 'store-completed-1',
    title: '수원에서 저녁 매칭',
    description: pickFromPool(SCREEN_JOIN_BODIES, 'store-completed-1'),
    track: 'SCREEN',
    status: JoinStatus.COMPLETED,
    host: 'doyun',
    completed: [],
    confirmed: [],
    startAt: past(24 * 6 + 20),
    plannedPlayerCount: 3,
    storeSlug: 'suwon',
    condition: historyCondition,
  });
  plans.push({
    key: 'club-completed-1',
    title: '마포 야간 한 게임',
    description: pickFromPool(SCREEN_JOIN_BODIES, 'club-completed-1'),
    track: 'SCREEN',
    status: JoinStatus.COMPLETED,
    host: 'minjae',
    completed: [],
    confirmed: [],
    startAt: past(24 * 8 + 21),
    plannedPlayerCount: 4,
    storeSlug: 'mapo',
    condition: historyCondition,
  });

  const extraHosts: Array<{ key: string; host: DemoPersonaSlug; store: string; hoursAgo: number }> = [
    { key: 'host-dohyun-1', host: 'dohyun', store: 'ilsan', hoursAgo: 50 },
    { key: 'host-dohyun-2', host: 'dohyun', store: 'ilsan', hoursAgo: 74 },
    { key: 'host-junhyuk-1', host: 'junhyuk', store: 'yongin', hoursAgo: 98 },
    { key: 'host-junhyuk-2', host: 'junhyuk', store: 'yongin', hoursAgo: 122 },
    { key: 'host-chaewon-1', host: 'chaewon', store: 'anyang', hoursAgo: 40 },
    { key: 'host-taeyang-1', host: 'taeyang', store: 'namyangju', hoursAgo: 64 },
    { key: 'host-taeyang-2', host: 'taeyang', store: 'namyangju', hoursAgo: 88 },
    { key: 'host-seungho-1', host: 'seungho', store: 'dunsan', hoursAgo: 70 },
    { key: 'host-seungho-2', host: 'seungho', store: 'dunsan', hoursAgo: 94 },
    { key: 'host-yujin-1', host: 'yujin', store: 'dunsan', hoursAgo: 46 },
    { key: 'host-seongmin-1', host: 'seongmin', store: 'hwaseong', hoursAgo: 58 },
  ];
  for (const row of extraHosts) {
    plans.push({
      key: row.key,
      title: screenTitle(row.key, row.store),
      description: pickFromPool(SCREEN_JOIN_BODIES, row.key),
      track: 'SCREEN',
      status: JoinStatus.COMPLETED,
      host: row.host,
      completed: [],
      confirmed: [],
      startAt: past(row.hoursAgo),
      plannedPlayerCount: 3,
      storeSlug: row.store,
      condition: pickCondition(row.key, 'SCREEN'),
    });
  }

  return plans;
}

export function buildOpenJoinPlans(now: Date): DemoJoinPlan[] {
  const screenSlots = cycleSlots(buildScreenSlots(now), SCREEN_OPEN_TARGET, 'screen-open');
  const fieldSlots = cycleSlots(buildFieldSlots(now), FIELD_OPEN_TARGET, 'field-open');
  const plans: DemoJoinPlan[] = [];

  for (const [index, slot] of screenSlots.entries()) {
    const key = slot.key;
    const storeSlug = pickStore(key);
    const host = pickHost(key);
    const capacity = pickCapacity(key);
    const confirmed = occupancyConfirmed(key, capacity, host);
    const isUrgent = slot.bucket === 'tonight' && index % 4 === 0;
    plans.push({
      key,
      title: screenTitle(key, storeSlug),
      description: pickFromPool(SCREEN_JOIN_BODIES, key),
      track: 'SCREEN',
      status: JoinStatus.OPEN,
      host,
      completed: [],
      confirmed,
      startAt: slot.startAt,
      plannedPlayerCount: capacity,
      storeSlug,
      bucket: slot.bucket,
      isUrgent,
      condition: pickCondition(key, 'SCREEN'),
    });
  }

  const fieldHosts = DEMO_PERSONAS.filter((row) => row.role === 'host' || row.role === 'club').map((row) => row.slug);
  for (const [index, slot] of fieldSlots.entries()) {
    const key = slot.key;
    const host = pickHost(key, fieldHosts);
    const recruit = 1 + (hashKey(`${key}:spots`) % 3);
    const capacity = recruit + 1;
    const confirmed = occupancyConfirmed(key, capacity, host);
    plans.push({
      key,
      title: fieldTitle(key),
      description: pickFromPool(FIELD_JOIN_BODIES, key),
      track: 'FIELD',
      status: JoinStatus.OPEN,
      host,
      completed: [],
      confirmed,
      startAt: slot.startAt,
      plannedPlayerCount: capacity,
      fieldIndex: index % 12,
      bucket: slot.bucket,
      greenFeePerPerson: GREEN_FEES[hashKey(`${key}:fee`) % GREEN_FEES.length],
      condition: pickCondition(key, 'FIELD'),
    });
  }

  return plans;
}

export function buildJoinPlans(now = new Date()): DemoJoinPlan[] {
  const plans = [...buildHistoryJoinPlans(now), ...buildOpenJoinPlans(now)];
  const keys = new Set<string>();
  for (const plan of plans) {
    if (keys.has(plan.key)) throw new Error(`duplicate_join_key ${plan.key}`);
    keys.add(plan.key);
    assertSafeUiCopy(plan.title, `join.${plan.key}.title`);
    assertSafeUiCopy(plan.description, `join.${plan.key}.body`);
  }
  return plans;
}

export function summarizeJoinPlans(plans: DemoJoinPlan[]): {
  screenTotal: number;
  fieldTotal: number;
  screenOpen: number;
  fieldOpen: number;
  screenCompleted: number;
  fieldCompleted: number;
  buckets: Record<string, number>;
} {
  const buckets: Record<string, number> = {};
  let screenOpen = 0;
  let fieldOpen = 0;
  let screenCompleted = 0;
  let fieldCompleted = 0;
  for (const plan of plans) {
    if (plan.track === 'SCREEN' && plan.status === JoinStatus.OPEN) screenOpen += 1;
    if (plan.track === 'FIELD' && plan.status === JoinStatus.OPEN) fieldOpen += 1;
    if (plan.track === 'SCREEN' && plan.status === JoinStatus.COMPLETED) screenCompleted += 1;
    if (plan.track === 'FIELD' && plan.status === JoinStatus.COMPLETED) fieldCompleted += 1;
    if (plan.bucket) buckets[plan.bucket] = (buckets[plan.bucket] ?? 0) + 1;
  }
  return {
    screenTotal: screenOpen + screenCompleted,
    fieldTotal: fieldOpen + fieldCompleted,
    screenOpen,
    fieldOpen,
    screenCompleted,
    fieldCompleted,
    buckets,
  };
}

export function joinIdempotencyKey(planKey: string): string {
  return `${INVESTOR_DEMO_JOIN_KEY_PREFIX}${planKey}`;
}
