import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AgeBand, type PublicUserProfileDto } from '@jjoin/types';
import {
  buildPublicProfileDisplay,
  formatPublicProfileDemographicLine,
  formatPublicProfileDrinkingValue,
  formatPublicProfileHandicapValue,
  formatPublicProfileSmokingValue,
} from './public-profile-display';

const screenPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../screens/PublicProfileScreen.tsx',
);
const sectionsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../components/PublicProfileSections.tsx',
);

function fixture(overrides: Partial<PublicUserProfileDto> = {}): PublicUserProfileDto {
  return {
    id: 'u1',
    nickname: '남성이',
    verifiedBadge: false,
    avatarUrl: null,
    genderDisplay: '남성',
    ageBand: AgeBand.THIRTIES,
    regionLabel: '경기 남부',
    bio: '다산·별내 스크린을 좋아합니다.',
    personality: null,
    age: 36,
    heightCm: 184,
    drinking: 'SOMETIMES',
    smoking: 'NONE',
    sportProfiles: [
      {
        sportCode: 'SCREEN_GOLF',
        skillLevel: 'INTERMEDIATE',
        fieldHandicap: 10,
        screenHandicap: 6,
      },
    ],
    participationCount: 17,
    completedJoinCount: 2,
    noShowCount: 0,
    attendanceRatePercent: null,
    participationTrustLabel: '신규',
    ...overrides,
  };
}

test('demographic line uses Korean age band, not raw enum', () => {
  assert.equal(
    formatPublicProfileDemographicLine(fixture()),
    '남성 · 30대 · 경기 남부',
  );
  assert.equal(
    formatPublicProfileDemographicLine(fixture({ ageBand: AgeBand.UNSPECIFIED })),
    '남성 · 경기 남부',
  );
  assert.doesNotMatch(formatPublicProfileDemographicLine(fixture()) ?? '', /THIRTIES/);
});

test('lifestyle values do not repeat the row label', () => {
  assert.equal(formatPublicProfileDrinkingValue('NONE'), '안 함');
  assert.equal(formatPublicProfileDrinkingValue('SOMETIMES'), '가끔');
  assert.equal(formatPublicProfileSmokingValue('NONE'), '안 함');
  assert.equal(formatPublicProfileSmokingValue('E_CIG'), '전자담배');
  assert.doesNotMatch(formatPublicProfileDrinkingValue('NONE') ?? '', /음주/);
  assert.doesNotMatch(formatPublicProfileSmokingValue('NONE') ?? '', /흡연/);
});

test('handicap value is numeric only so section labels are not duplicated', () => {
  assert.equal(formatPublicProfileHandicapValue(10), '10');
  assert.equal(formatPublicProfileHandicapValue(null), '미설정');
  assert.doesNotMatch(formatPublicProfileHandicapValue(6), /핸디/);
});

test('buildPublicProfileDisplay groups existing DTO fields without inventing values', () => {
  const model = buildPublicProfileDisplay(fixture());

  assert.equal(model.demographicLine, '남성 · 30대 · 경기 남부');
  assert.deepEqual(model.introParagraphs, ['다산·별내 스크린을 좋아합니다.']);
  assert.deepEqual(
    model.basicFacts.map((fact) => `${fact.label}:${fact.value}`),
    ['나이:36세', '키:184cm', '음주:가끔', '흡연:안 함'],
  );
  assert.deepEqual(
    model.golfFacts.map((fact) => `${fact.label}:${fact.value}`),
    ['필드 핸디:10', '스크린 핸디:6'],
  );
  assert.equal(model.trustLabel, '신규');
  assert.equal(model.trustVariant, 'gold');
  assert.deepEqual(
    model.activityStats.map((fact) => `${fact.label}:${fact.value}`),
    ['참여:17', '참석:2', '노쇼:0', '참석률:기록 없음'],
  );
  assert.equal(
    model.basicFacts.some((fact) => fact.value.includes(fact.label)),
    false,
  );
  assert.equal(
    model.golfFacts.some((fact) => fact.value.includes('핸디')),
    false,
  );
});

test('empty lifestyle and intro stay omitted; golf still shows 미설정', () => {
  const model = buildPublicProfileDisplay(
    fixture({
      bio: '   ',
      personality: null,
      age: null,
      heightCm: null,
      drinking: null,
      smoking: null,
      sportProfiles: [],
      playedCountWithViewer: 2,
      averageRatingDisplay: '4.8',
      reviewCount: 3,
    }),
  );

  assert.deepEqual(model.introParagraphs, []);
  assert.deepEqual(model.basicFacts, []);
  assert.deepEqual(
    model.golfFacts.map((fact) => fact.value),
    ['미설정', '미설정'],
  );
  assert.equal(model.playedTogetherLine, '함께 2회 플레이');
  assert.equal(model.ratingLine, '★ 4.8 · 후기 3');
});

test('public profile screen composes sectioned design-system layout', () => {
  const screen = readFileSync(screenPath, 'utf8');
  const sections = readFileSync(sectionsPath, 'utf8');

  assert.match(screen, /buildPublicProfileDisplay/);
  assert.match(screen, /PublicProfileFactSection/);
  assert.match(screen, /기본 정보/);
  assert.match(screen, /골프/);
  assert.match(sections, /JoinDetailSection/);
  assert.match(sections, /JoinMiniStatGrid/);
  assert.match(sections, /소개/);
  assert.match(sections, /조인 활동/);
  assert.doesNotMatch(screen, /DEMO|데모/);
  assert.doesNotMatch(sections, /DEMO|데모/);
  assert.doesNotMatch(screen, /formatFieldHandicap|formatScreenHandicap/);
});
