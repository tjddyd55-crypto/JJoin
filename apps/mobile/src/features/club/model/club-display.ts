import {
  clubActivityTypeLabel,
  formatAttendanceRateDisplay,
  formatClubActivityRegionsCompact,
} from '@jjoin/domain';
import type { ClubDiscoverCardDto, ClubSummaryDto } from '@jjoin/types';
import type { ClubCoverFallbackTone, ClubStatusBadgeTone } from '@jjoin/design-system';

export function clubCoverFallbackTone(clubId: string): ClubCoverFallbackTone {
  let hash = 0;
  for (let i = 0; i < clubId.length; i++) {
    hash = (hash + clubId.charCodeAt(i)) % 2;
  }
  return hash === 0 ? 'green' : 'blue';
}

export function formatClubCardMetaLine(
  club: Pick<ClubSummaryDto, 'activityType' | 'activityRegions' | 'region' | 'memberCount'>,
): string {
  const regionCompact = formatClubActivityRegionsCompact(club.activityRegions ?? [], {
    maxParts: 2,
  });
  const region = regionCompact || club.region;
  return `${clubActivityTypeLabel(club.activityType)} · ${region} · 회원 ${club.memberCount}`;
}

export function formatClubActivityLine(club: ClubDiscoverCardDto): string | null {
  if (club.recent30DayEvents > 0) {
    const rate = formatAttendanceRateDisplay(club.recent30DayAttendanceRate);
    return `최근 30일 모임 ${club.recent30DayEvents}회 · 참석률 ${rate}`;
  }
  if (club.eventsThisYear > 0) {
    return `올해 모임 ${club.eventsThisYear}회`;
  }
  return null;
}

export function formatClubMembershipStatusLabel(
  status: ClubSummaryDto['myStatus'],
): { label: string; tone: ClubStatusBadgeTone } | null {
  if (status === 'PENDING') return { label: '승인 대기 중', tone: 'pending' };
  if (status === 'ACTIVE') return { label: '가입됨', tone: 'active' };
  return null;
}

export function filterClubsByQuery<T extends ClubSummaryDto>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((club) => {
    const haystack = [
      club.name,
      club.intro ?? '',
      club.region,
      formatClubActivityRegionsCompact(club.activityRegions ?? [], { maxParts: 4 }),
      clubActivityTypeLabel(club.activityType),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export type ClubDiscoverFilter = 'all' | 'active' | 'mine';

export function filterDiscoverClubs(
  items: ClubDiscoverCardDto[],
  filter: ClubDiscoverFilter,
): ClubDiscoverCardDto[] {
  switch (filter) {
    case 'active':
      return items.filter((club) => club.recent30DayEvents > 0);
    case 'mine':
      return items.filter(
        (club) => club.myStatus === 'ACTIVE' || club.myStatus === 'PENDING',
      );
    default:
      return items;
  }
}

export function partitionDiscoverSections(items: ClubDiscoverCardDto[]) {
  const seen = new Set<string>();
  const active: ClubDiscoverCardDto[] = [];
  const recommended: ClubDiscoverCardDto[] = [];

  for (const club of items) {
    if (club.myStatus === 'ACTIVE' || club.myStatus === 'PENDING') continue;
    if (club.recent30DayEvents > 0 && !seen.has(club.id)) {
      active.push(club);
      seen.add(club.id);
    }
  }
  for (const club of items) {
    if (seen.has(club.id)) continue;
    if (club.myStatus === 'ACTIVE' || club.myStatus === 'PENDING') continue;
    recommended.push(club);
    seen.add(club.id);
  }
  return { active, recommended };
}
