import {
  buildStoreMatchingSecondaryLabel,
  canConfirmMatchingAttendance,
  formatMatchingDeadlineHint,
  formatSignedCoin,
  resolveStoreMatchingDisplayStatus,
  storeMatchingDisplayStatusLabel,
  storeMatchingOwnerListPriority,
  type StoreMatchingDisplayAudience,
  type StoreMatchingDisplayStatus,
} from '@jjoin/domain';
import {
  JoinKind,
  MatchingRewardTarget,
  type DiscoverJoinCardDto,
  type JoinDetailDto,
  type JoinListItemDto,
} from '@jjoin/types';

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
  join: { joinKind?: JoinKind | string | null },
): boolean {
  return join.joinKind === JoinKind.STORE_MATCHING;
}

export function matchingRewardBenefitLabel(
  target: MatchingRewardTarget | null | undefined,
  amount: string,
): string | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const signed = formatSignedCoin(amount);
  switch (target) {
    case MatchingRewardTarget.FEMALE:
      return `여성 참가 혜택 ${signed}`;
    case MatchingRewardTarget.MALE:
      return `남성 참가 혜택 ${signed}`;
    case MatchingRewardTarget.ALL:
      return `참가 혜택 ${signed}`;
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

type MatchingStatusSource = {
  joinKind?: JoinKind | string | null;
  status: string;
  startAt: string;
  scheduledEndAt: string;
  confirmedPlayerCount?: number;
  plannedPlayerCount?: number;
  currentParticipants?: number;
  maxParticipants?: number;
  recruitClosesAt?: string | null;
  minimumPlayers?: number | null;
  displayStatus?: StoreMatchingDisplayStatus;
  displayStatusLabel?: string;
  displaySubtitle?: string | null;
  canConfirmAttendance?: boolean;
  remainingSlots?: number;
  ownerListPriority?: number;
  recruitmentLabel?: string | null;
};

function rosterCounts(join: MatchingStatusSource): {
  confirmed: number;
  planned: number;
} {
  return {
    confirmed: join.confirmedPlayerCount ?? join.currentParticipants ?? 0,
    planned: join.plannedPlayerCount ?? join.maxParticipants ?? 0,
  };
}

function deriveDisplayStatus(join: MatchingStatusSource): StoreMatchingDisplayStatus | null {
  if (!isStoreMatchingJoin(join)) return null;
  if (join.displayStatus) return join.displayStatus;
  const { confirmed, planned } = rosterCounts(join);
  return resolveStoreMatchingDisplayStatus({
    now: new Date(),
    status: join.status,
    recruitClosesAt: join.recruitClosesAt ? new Date(join.recruitClosesAt) : null,
    startAt: new Date(join.startAt),
    scheduledEndAt: new Date(join.scheduledEndAt),
    confirmedPlayerCount: confirmed,
    minimumPlayers: join.minimumPlayers,
  });
}

export function matchingDisplayStatusLabel(
  join: MatchingStatusSource,
  audience: StoreMatchingDisplayAudience = 'host',
): string | null {
  if (!isStoreMatchingJoin(join)) return null;
  if (audience === 'host' && join.displayStatusLabel) return join.displayStatusLabel;
  const status = deriveDisplayStatus(join);
  if (!status) return null;
  const { confirmed } = rosterCounts(join);
  return storeMatchingDisplayStatusLabel(status, {
    audience,
    confirmedPlayerCount: confirmed,
  });
}

export function matchingDisplaySubtitle(join: MatchingStatusSource): string | null {
  if (!isStoreMatchingJoin(join)) return null;
  if (join.displaySubtitle) return join.displaySubtitle;
  const status = deriveDisplayStatus(join);
  if (!status) return null;
  const { confirmed, planned } = rosterCounts(join);
  return buildStoreMatchingSecondaryLabel({
    displayStatus: status,
    recruitmentLabel: join.recruitmentLabel,
    remainingSlots: join.remainingSlots ?? Math.max(0, planned - confirmed),
    confirmedPlayerCount: confirmed,
    recruitClosesAt: join.recruitClosesAt ? new Date(join.recruitClosesAt) : null,
    now: new Date(),
  });
}

export function matchingCanConfirmAttendance(join: MatchingStatusSource): boolean {
  if (!isStoreMatchingJoin(join)) return false;
  if (typeof join.canConfirmAttendance === 'boolean') return join.canConfirmAttendance;
  return canConfirmMatchingAttendance({
    now: new Date(),
    status: join.status,
    scheduledEndAt: new Date(join.scheduledEndAt),
  });
}

export function matchingOwnerListPriority(join: MatchingStatusSource): number {
  if (typeof join.ownerListPriority === 'number') return join.ownerListPriority;
  const status = deriveDisplayStatus(join);
  if (!status) return 99;
  return storeMatchingOwnerListPriority(status);
}

export function matchingDeadlineHint(join: MatchingStatusSource): string | null {
  if (!isStoreMatchingJoin(join) || !join.recruitClosesAt) return null;
  return formatMatchingDeadlineHint(new Date(join.recruitClosesAt), new Date());
}

export function matchingRewardResultLabel(params: {
  completed: boolean;
  paidAmount?: string | null;
  noshow?: boolean;
}): string | null {
  if (!params.completed) return null;
  if (params.noshow) return '보상 미지급';
  if (params.paidAmount && Number(params.paidAmount) > 0) {
    return `${formatSignedCoin(params.paidAmount)} 지급`;
  }
  return null;
}
