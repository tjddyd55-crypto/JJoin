import { DEMO_CLUBS } from './investor-demo-venues.ts';
import type { DemoBannerSpec } from './investor-demo-venues.ts';
import type { DemoPersonaSlug } from './investor-demo-personas.ts';

export const DEMO_SUBJECT_PREFIX = 'investor-demo-';
export const DEMO_EMAIL_DOMAIN = 'jjoin.zone.demo';
export const DEMO_JOIN_TITLE_PREFIX = '';
export const DEMO_FACILITY_KEY_PREFIX = 'investor-demo-facility-';
export const DEMO_COURSE_EXTERNAL_PREFIX = 'investor-demo-course-';
export const DEMO_VENUE_PLACE_PREFIX = 'investor-demo-venue-';
export const DEMO_CLUB_NAME_PREFIX = '';
export const DEMO_BANNER_TITLE_PREFIX = '';
export const DEMO_DM_KEY_PREFIX = 'investor-demo-dm:';

/** Physical-device / mock-auth QA accounts — never seed or delete these. */
export const PROTECTED_PROVIDER_SUBJECTS = [
  'dev-persona-a',
  'dev-persona-b',
  'dev-persona-c',
  'dev-persona-admin',
  'dev-persona-billing-low',
  'dev-persona-billing-retry',
] as const;

export const PROTECTED_NICKNAME_MARKERS = [
  '김진우_DEV_A',
  '박민수_DEV_B',
  '이서연_DEV_C',
  '운영관리자_DEV_ADMIN',
  '빌링저액',
  '빌링재시도',
  'QAUser',
  'DevE2E',
] as const;

export function demoEmail(slug: DemoPersonaSlug): string {
  return `investor-demo+${slug}@${DEMO_EMAIL_DOMAIN}`;
}

export function demoProviderSubject(slug: DemoPersonaSlug): string {
  return `${DEMO_SUBJECT_PREFIX}${slug}`;
}

export function demoBannerTitle(spec: DemoBannerSpec): string {
  return `${DEMO_BANNER_TITLE_PREFIX}${spec.title}`;
}

export function demoClubName(name = DEMO_CLUBS[0]!.name): string {
  return `${DEMO_CLUB_NAME_PREFIX}${name}`;
}

export function isProtectedProviderSubject(subject: string): boolean {
  return PROTECTED_PROVIDER_SUBJECTS.includes(subject as (typeof PROTECTED_PROVIDER_SUBJECTS)[number]);
}

export function isProtectedNickname(nickname: string): boolean {
  return PROTECTED_NICKNAME_MARKERS.some((marker) => nickname.includes(marker));
}

export function isDemoEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`));
}

export function isDemoProviderSubject(subject: string): boolean {
  return subject.startsWith(DEMO_SUBJECT_PREFIX);
}
