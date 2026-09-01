import { isTodayValidJoin, localDayKey } from '@jjoin/domain';
import type { DiscoverJoinCardDto, RecommendedJoinDto } from '@jjoin/types';

export function formatHomeJoinTime(startAt: string, now = new Date()): string {
  const isToday = localDayKey(startAt) === localDayKey(now);
  const time = new Date(startAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return isToday ? `오늘 ${time}` : time;
}

export function formatHomeRegionLabel(regionLabel: string | null | undefined, sigungu?: string | null) {
  return sigungu ?? regionLabel ?? '지역 미정';
}

export function formatRemainingSeats(count: number): string {
  return count <= 0 ? '마감' : `${count}자리 남음`;
}

export function pickTodayDiscoverJoins(items: DiscoverJoinCardDto[], limit = 2, now = new Date()) {
  const joinable = items.filter((j) => j.canJoinState === 'JOINABLE' || j.canJoin);
  const today = joinable.filter((j) =>
    isTodayValidJoin({
      status: j.status,
      startAt: j.startAt,
      scheduledEndAt: j.scheduledEndAt,
      now,
    }),
  );
  const sorted = [...today].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  return sorted.slice(0, limit);
}

export function pickUrgentJoins(
  _discover: DiscoverJoinCardDto[],
  recommended: RecommendedJoinDto[],
  limit = 1,
) {
  return recommended
    .filter((j) => j.isUrgent)
    .map((j) => ({
      joinId: j.joinId,
      venueName: j.venueName,
      startAt: j.startAt,
      seatsLeft: j.seatsLeft,
      regionLabel: null as string | null,
      isUrgent: true as const,
    }))
    .slice(0, limit);
}

export function clubAttendanceLabel(response: string | null | undefined): string | null {
  switch (response) {
    case 'ATTENDING':
      return '참석';
    case 'DECLINED':
      return '불참';
    case 'MAYBE':
      return '미정';
    case 'NO_RESPONSE':
      return '미응답';
    default:
      return null;
  }
}
