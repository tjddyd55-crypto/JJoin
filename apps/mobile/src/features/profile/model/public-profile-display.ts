import { formatDrinkingHabitLabel, formatSmokingHabitLabel } from '@jjoin/domain';
import { SCREEN_GOLF_CODE, type PublicUserProfileDto, type SportProfileDto } from '@jjoin/types';
import type { BadgeVariant, JoinMiniStatSurface } from '@jjoin/design-system';

const AGE_BAND_LABEL: Record<string, string> = {
  TEENS: '10대',
  TWENTIES: '20대',
  THIRTIES: '30대',
  FORTIES: '40대',
  FIFTIES_PLUS: '50대 이상',
};

export type PublicProfileFact = {
  label: string;
  value: string;
  surface?: JoinMiniStatSurface;
};

export type PublicProfileDisplayModel = {
  nickname: string;
  avatarUrl: string | null;
  verified: boolean;
  demographicLine: string | null;
  ratingLine: string | null;
  playedTogetherLine: string | null;
  introParagraphs: string[];
  basicFacts: PublicProfileFact[];
  golfFacts: PublicProfileFact[];
  trustLabel: string | null;
  trustVariant: BadgeVariant;
  activityStats: PublicProfileFact[];
};

export function formatPublicProfileAgeBand(ageBand: string | null | undefined): string | null {
  if (!ageBand || ageBand === 'UNSPECIFIED') return null;
  return AGE_BAND_LABEL[ageBand] ?? null;
}

export function formatPublicProfileDemographicLine(
  profile: Pick<PublicUserProfileDto, 'genderDisplay' | 'ageBand' | 'regionLabel'>,
): string | null {
  const line = [profile.genderDisplay, formatPublicProfileAgeBand(profile.ageBand), profile.regionLabel]
    .filter(Boolean)
    .join(' · ');
  return line || null;
}

export function formatPublicProfileRatingLine(
  profile: Pick<PublicUserProfileDto, 'averageRatingDisplay' | 'reviewCount'>,
): string | null {
  if ((profile.reviewCount ?? 0) <= 0 || !profile.averageRatingDisplay) return null;
  return `★ ${profile.averageRatingDisplay} · 후기 ${profile.reviewCount}`;
}

export function formatPublicProfilePlayedTogetherLine(
  playedCountWithViewer: number | null | undefined,
): string | null {
  if (playedCountWithViewer == null || playedCountWithViewer <= 0) return null;
  return `함께 ${playedCountWithViewer}회 플레이`;
}

export function formatPublicProfileDrinkingValue(
  drinking: PublicUserProfileDto['drinking'],
): string | null {
  if (drinking === 'NONE') return '안 함';
  return formatDrinkingHabitLabel(drinking);
}

export function formatPublicProfileSmokingValue(
  smoking: PublicUserProfileDto['smoking'],
): string | null {
  if (smoking === 'NONE') return '안 함';
  return formatSmokingHabitLabel(smoking);
}

export function formatPublicProfileHandicapValue(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '미설정';
  return String(value);
}

export function pickPublicProfileGolfSkill(
  sportProfiles: SportProfileDto[],
): SportProfileDto | undefined {
  return sportProfiles.find((skill) => skill.sportCode === SCREEN_GOLF_CODE) ?? sportProfiles[0];
}

export function buildPublicProfileBasicFacts(
  profile: Pick<PublicUserProfileDto, 'age' | 'heightCm' | 'drinking' | 'smoking'>,
): PublicProfileFact[] {
  const facts: PublicProfileFact[] = [];
  if (profile.age != null) facts.push({ label: '나이', value: `${profile.age}세` });
  if (profile.heightCm != null) facts.push({ label: '키', value: `${profile.heightCm}cm` });
  const drinking = formatPublicProfileDrinkingValue(profile.drinking);
  if (drinking) facts.push({ label: '음주', value: drinking });
  const smoking = formatPublicProfileSmokingValue(profile.smoking);
  if (smoking) facts.push({ label: '흡연', value: smoking });
  return facts;
}

export function buildPublicProfileGolfFacts(
  skill: Pick<SportProfileDto, 'fieldHandicap' | 'screenHandicap'> | undefined,
): PublicProfileFact[] {
  return [
    { label: '필드 핸디', value: formatPublicProfileHandicapValue(skill?.fieldHandicap) },
    { label: '스크린 핸디', value: formatPublicProfileHandicapValue(skill?.screenHandicap) },
  ];
}

export function resolvePublicProfileTrustVariant(label: string | null | undefined): BadgeVariant {
  if (label === '주의') return 'warning';
  if (label === '신규') return 'gold';
  if (label === '안정적' || label === '매우 안정적') return 'success';
  return 'neutral';
}

export function buildPublicProfileActivityStats(
  profile: Pick<
    PublicUserProfileDto,
    'participationCount' | 'completedJoinCount' | 'noShowCount' | 'attendanceRatePercent'
  >,
): PublicProfileFact[] {
  return [
    { label: '참여', value: String(profile.participationCount), surface: 'info' },
    { label: '참석', value: String(profile.completedJoinCount ?? 0), surface: 'success' },
    { label: '노쇼', value: String(profile.noShowCount ?? 0), surface: 'neutral' },
    {
      label: '참석률',
      value:
        profile.attendanceRatePercent == null ? '기록 없음' : `${profile.attendanceRatePercent}%`,
      surface: 'info',
    },
  ];
}

function collectIntroParagraphs(profile: Pick<PublicUserProfileDto, 'bio' | 'personality'>): string[] {
  return [profile.bio?.trim(), profile.personality?.trim()].filter(
    (text): text is string => Boolean(text),
  );
}

export function buildPublicProfileDisplay(profile: PublicUserProfileDto): PublicProfileDisplayModel {
  return {
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    verified: profile.verifiedBadge,
    demographicLine: formatPublicProfileDemographicLine(profile),
    ratingLine: formatPublicProfileRatingLine(profile),
    playedTogetherLine: formatPublicProfilePlayedTogetherLine(profile.playedCountWithViewer),
    introParagraphs: collectIntroParagraphs(profile),
    basicFacts: buildPublicProfileBasicFacts(profile),
    golfFacts: buildPublicProfileGolfFacts(pickPublicProfileGolfSkill(profile.sportProfiles)),
    trustLabel: profile.participationTrustLabel ?? null,
    trustVariant: resolvePublicProfileTrustVariant(profile.participationTrustLabel),
    activityStats: buildPublicProfileActivityStats(profile),
  };
}
