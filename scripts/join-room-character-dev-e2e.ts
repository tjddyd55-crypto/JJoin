/**
 * Join room character + operator profile — Railway Development only.
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/join-room-character-dev-e2e.ts
 */
import {
  JoinAfterPlan,
  JoinGameStyle,
  JoinMethod,
  JoinParticipantSkillMode,
  MockAuthPersona,
  SocialProvider,
  SCREEN_GOLF_CODE,
} from '../packages/types/src/index.ts';

const API_BASE = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';
const TAG = 'join-room-char-e2e';

type Auth = { Authorization: string; userId: string };

async function j<T>(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  let body = {} as T;
  try {
    body = JSON.parse(raw) as T;
  } catch {
    /* empty */
  }
  return { status: res.status, body, raw };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function signIn(persona: MockAuthPersona): Promise<Auth> {
  const { status, body } = await j<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    { method: 'POST', body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }) },
  );
  assert(status >= 200 && status < 300, `signIn ${persona} ${status}`);
  return { Authorization: `Bearer ${body.session.accessToken}`, userId: body.session.userId };
}

async function mustOk<T>(path: string, init?: RequestInit): Promise<T> {
  const { status, body, raw } = await j<T>(path, init);
  assert(status >= 200 && status < 300, `${path} -> ${status} ${raw.slice(0, 500)}`);
  return body;
}

async function main() {
  const health = await mustOk<{
    status: string;
    database: string;
    railwayEnvironment?: string;
    appVariant?: string;
  }>('/health');
  assert(health.database === 'connected', 'database not connected');
  assert(health.railwayEnvironment === 'development', `expected development env`);
  assert(health.appVariant === 'development', `expected development appVariant`);

  const admin = await signIn(MockAuthPersona.DEV_ADMIN);
  const host = await signIn(MockAuthPersona.DEV_A);

  const operatorPayload = {
    businessName: 'DEV TEST OPERATOR',
    brandName: 'DEV QA ONLY',
    representativeName: 'DEV QA',
    businessRegistrationNumber: '123-45-67890',
    ecommerceRegistrationNumber: 'DEV-ECOMM-001',
    businessAddress: 'DEV QA Address Only',
    customerServicePhone: '01012345678',
    customerServiceEmail: 'dev-qa@example.invalid',
    customerServiceHours: '평일 10:00~18:00 (DEV)',
    privacyOfficerName: 'DEV Privacy Officer',
    privacyDepartment: 'DEV QA Team',
    privacyEmail: 'privacy-dev@example.invalid',
    privacyPhone: '01087654321',
    paymentInquiryPhone: '01011112222',
    paymentInquiryEmail: 'payment-dev@example.invalid',
  };

  const savedOperator = await mustOk<{
    businessName: string;
    updatedAt: string;
    updatedBy: string | null;
    completeness: { complete: boolean };
  }>('/admin/service-operator-profile', {
    method: 'PUT',
    headers: admin,
    body: JSON.stringify(operatorPayload),
  });
  assert(savedOperator.businessName === operatorPayload.businessName, 'operator save failed');
  assert(savedOperator.updatedBy === admin.userId, 'operator updatedBy');

  const publicOperator = await mustOk<{ businessName: string | null; displayLines: Array<{ label: string; value: string }> }>(
    '/public/service-operator-profile',
  );
  assert(publicOperator.businessName === operatorPayload.businessName, 'public operator mismatch');
  assert(publicOperator.displayLines.length > 0, 'public displayLines empty');

  const releaseSaved = await mustOk<{ latestVersionCode: number; apkUrl: string }>(
    '/admin/mobile-release/android',
    {
      method: 'PUT',
      headers: admin,
      body: JSON.stringify({
        latestVersionCode: 99,
        latestVersionName: '9.9.9-dev',
        apkUrl: 'https://example.invalid/dev-qa.apk',
        releaseNotes: 'DEV QA only — not production',
      }),
    },
  );
  assert(releaseSaved.latestVersionCode === 99, 'release save failed');

  const publicRelease = await mustOk<{ latestVersionCode: number; latestVersionName: string }>(
    '/public/mobile-release/android',
  );
  assert(publicRelease.latestVersionCode === 99, 'public release mismatch');

  await mustOk('/me/profile', {
    method: 'PATCH',
    headers: host,
    body: JSON.stringify({ screenHandicap: -3 }),
  });
  const me = await mustOk<{
    publicProfile: { sportProfiles: Array<{ screenHandicap: number | null }> } | null;
  }>('/me', { headers: host });
  const sh = me.publicProfile?.sportProfiles.find((sp) => sp.screenHandicap != null)?.screenHandicap;
  assert(sh === -3, `screenHandicap readback ${sh}`);

  const created = await mustOk<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: host,
    body: JSON.stringify({
      sportCode: SCREEN_GOLF_CODE,
      venue: {
        provider: 'MOCK',
        providerPlaceId: `venue_${TAG}_${Date.now()}`,
        name: `[${TAG}] venue`,
        address: 'DEV QA',
        regionLabel: '서울',
        latitude: 37.5665,
        longitude: 126.978,
      },
      startAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
      plannedPlayerCount: 4,
      joinMethod: JoinMethod.OPEN,
      title: `[${TAG}] ${Date.now()}`,
      participantSkillMode: JoinParticipantSkillMode.HANDICAP_RANGE,
      minScreenHandicap: 5,
      maxScreenHandicap: 15,
      gameStyle: JoinGameStyle.LIGHT_GAME,
      gameMemo: 'DEV custom game memo',
      afterPlan: JoinAfterPlan.MEAL_OR_DRINK,
      afterMemo: 'DEV after memo',
    }),
  });
  const joinId = created.joinId;

  const join = await mustOk<{
    participantSkillMode: string;
    minScreenHandicap: number | null;
    maxScreenHandicap: number | null;
    gameStyle: string;
    gameMemo: string | null;
    afterPlan: string;
    afterMemo: string | null;
  }>(`/joins/${joinId}`, { headers: host });
  assert(join.participantSkillMode === JoinParticipantSkillMode.HANDICAP_RANGE, 'skill mode');
  assert(join.minScreenHandicap === 5 && join.maxScreenHandicap === 15, 'handicap range');
  assert(join.gameStyle === JoinGameStyle.LIGHT_GAME, 'game style');
  assert(join.gameMemo === 'DEV custom game memo', 'game memo');
  assert(join.afterPlan === JoinAfterPlan.MEAL_OR_DRINK, 'after plan');

  const edited = await mustOk<{
    participantSkillMode: string;
    gameMemo: string | null;
    afterMemo: string | null;
  }>(`/joins/${joinId}`, {
    method: 'PATCH',
    headers: host,
    body: JSON.stringify({
      participantSkillMode: JoinParticipantSkillMode.BEGINNER_OK,
      gameStyle: JoinGameStyle.FRIENDLY,
      gameMemo: null,
      afterPlan: JoinAfterPlan.NONE,
      afterMemo: null,
    }),
  });
  assert(edited.participantSkillMode === JoinParticipantSkillMode.BEGINNER_OK, 'edit skill');
  assert(edited.gameMemo == null, 'edit cleared game memo');

  const detail = await mustOk<{
    participantSkillMode: string;
    gameStyle: string;
    afterPlan: string;
  }>(`/joins/${joinId}`, { headers: host });
  assert(detail.participantSkillMode === JoinParticipantSkillMode.BEGINNER_OK, 'detail skill');
  assert(detail.gameStyle === JoinGameStyle.FRIENDLY, 'detail game');
  assert(detail.afterPlan === JoinAfterPlan.NONE, 'detail after');

  const list = await mustOk<{ hosted: Array<{ joinId: string }> }>('/joins/mine', {
    headers: host,
  });
  assert(list.hosted.some((i) => i.joinId === joinId), 'hosted list contains join');

  console.log('PASS join-room-character-dev-e2e', {
    joinId,
    operatorBusinessName: publicOperator.businessName,
    releaseCode: publicRelease.latestVersionCode,
  });
}

main().catch((e) => {
  console.error('FAIL', e instanceof Error ? e.message : e);
  process.exit(1);
});
