import { JoinKind, MatchingRewardTarget, type DiscoverJoinCardDto, type JoinDetailDto } from '@jjoin/types';

export function formatKstTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function formatKstDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** Compose UTC ISO from KST date (YYYY-MM-DD) and time (HH:mm). */
export function composeKstIso(dateYmd: string, timeHm: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeHm.trim());
  if (!match || !timeMatch) {
    throw new Error('invalid_kst_datetime');
  }
  const [, y, mo, d] = match;
  const [, h, mi] = timeMatch;
  const kst = `${y}-${mo}-${d}T${h.padStart(2, '0')}:${mi}:00+09:00`;
  return new Date(kst).toISOString();
}

export function splitKstDateTime(iso: string): { dateYmd: string; timeHm: string } {
  const dateYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  const timeHm = formatKstTime(iso);
  return { dateYmd, timeHm };
}

export function isStoreMatchingJoin(
  join: Pick<DiscoverJoinCardDto | JoinDetailDto, 'joinKind'>,
): boolean {
  return join.joinKind === JoinKind.STORE_MATCHING;
}

export function matchingRewardBenefitLabel(
  target: MatchingRewardTarget | null | undefined,
  amount: string,
): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (target) {
    case MatchingRewardTarget.FEMALE:
      return `여성 참가 혜택 +${amount}C`;
    case MatchingRewardTarget.MALE:
      return `남성 참가 혜택 +${amount}C`;
    case MatchingRewardTarget.ALL:
      return `참가 혜택 +${amount}C`;
    default:
      return null;
  }
}

export function matchingSlotProgressLabel(
  targetMale: number | null | undefined,
  targetFemale: number | null | undefined,
  confirmedMale: number | null | undefined,
  confirmedFemale: number | null | undefined,
): string | null {
  const tm = targetMale ?? 0;
  const tf = targetFemale ?? 0;
  if (tm === 0 && tf === 0) return null;
  const cm = confirmedMale ?? 0;
  const cf = confirmedFemale ?? 0;
  return `남 ${cm}/${tm} · 여 ${cf}/${tf}`;
}

export function matchingDeadlineLabel(recruitClosesAt: string | null | undefined): string | null {
  if (!recruitClosesAt) return null;
  return `${formatKstTime(recruitClosesAt)} 마감`;
}
