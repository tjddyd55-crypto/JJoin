/**
 * Daily app attendance + host/participant achievement rewards.
 *
 * Date SSOT: Asia/Seoul (KST) calendar day. Unique (userId, kstDate).
 * Host success SSOT: Join.status === COMPLETED (not DRAFT/create/SETTLING/CANCELLED).
 * Participant success SSOT: role === PARTICIPANT && participationStatus === COMPLETED
 *   (not APPLIED/APPROVED/CONFIRMED alone).
 * Reward keys: attendanceGrantIdempotencyKey / milestoneGrantIdempotencyKey
 *   must match CoinIssuance + CoinTransaction.idempotencyKey.
 */

export const REWARD_POLICY_SETTINGS_ID = 'default';

export const REWARD_GRANT_KINDS = [
  'ATTENDANCE',
  'HOST_MILESTONE',
  'PARTICIPATION_MILESTONE',
] as const;
export type RewardGrantKind = (typeof REWARD_GRANT_KINDS)[number];

export type RewardMilestone = {
  threshold: number;
  amount: string;
};

export type RewardPolicySnapshot = {
  attendanceEnabled: boolean;
  attendanceAmount: string;
  hostEnabled: boolean;
  hostThreshold: number;
  hostAmount: string;
  participationEnabled: boolean;
  participationThreshold: number;
  participationAmount: string;
  hostMilestones: RewardMilestone[];
  participationMilestones: RewardMilestone[];
};

export const DEFAULT_HOST_MILESTONES: RewardMilestone[] = [
  { threshold: 1, amount: '3' },
  { threshold: 5, amount: '10' },
  { threshold: 10, amount: '20' },
  { threshold: 25, amount: '50' },
];

export const DEFAULT_PARTICIPATION_MILESTONES: RewardMilestone[] = [
  { threshold: 1, amount: '2' },
  { threshold: 5, amount: '5' },
  { threshold: 10, amount: '15' },
  { threshold: 25, amount: '40' },
];

export const DEFAULT_REWARD_POLICY: RewardPolicySnapshot = {
  attendanceEnabled: true,
  attendanceAmount: '1',
  hostEnabled: true,
  hostThreshold: DEFAULT_HOST_MILESTONES[0].threshold,
  hostAmount: DEFAULT_HOST_MILESTONES[0].amount,
  participationEnabled: true,
  participationThreshold: DEFAULT_PARTICIPATION_MILESTONES[0].threshold,
  participationAmount: DEFAULT_PARTICIPATION_MILESTONES[0].amount,
  hostMilestones: DEFAULT_HOST_MILESTONES,
  participationMilestones: DEFAULT_PARTICIPATION_MILESTONES,
};

export type AttendanceStreakSnapshot = {
  currentStreak: number;
  bestStreak: number;
  totalDays: number;
};

export type RewardToastCopy = {
  title: string;
  body: string;
};

export type RewardMilestoneProgress = {
  threshold: number;
  amount: string;
  remaining: number;
  reached: boolean;
  granted: boolean;
};

/** Hosted join counts only when Join.status is COMPLETED. */
export function isSuccessfulHostedJoin(joinStatus: string): boolean {
  return joinStatus === 'COMPLETED';
}

/** Participation counts only when the roster row is COMPLETED (attended). */
export function isSuccessfulParticipationStatus(status: string): boolean {
  return status === 'COMPLETED';
}

export function attendanceKstDateKey(parts: { year: number; month: number; day: number }): string {
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

/** Shift a YYYY-MM-DD calendar key by whole days (calendar math, not timezone). */
export function shiftKstDateKey(kstDate: string, days: number): string {
  const parsed = parseKstDateKey(kstDate);
  const utc = Date.UTC(parsed.year, parsed.month - 1, parsed.day + days);
  const shifted = new Date(utc);
  return attendanceKstDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

export function parseKstDateKey(kstDate: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(kstDate);
  if (!match) {
    throw new Error('invalid_kst_date');
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function isValidKstDateKey(kstDate: string): boolean {
  try {
    parseKstDateKey(kstDate);
    return true;
  } catch {
    return false;
  }
}

export function attendanceGrantIdempotencyKey(userId: string, kstDate: string): string {
  return `reward:attendance:${userId}:${kstDate}`;
}

export function milestoneGrantIdempotencyKey(
  kind: Exclude<RewardGrantKind, 'ATTENDANCE'>,
  userId: string,
  threshold: number,
): string {
  return `reward:${kind.toLowerCase()}:${userId}:${threshold}`;
}

export function attendanceRewardNotificationEventKey(userId: string, kstDate: string): string {
  return `ATTENDANCE_REWARD:${userId}:${kstDate}`;
}

export function achievementRewardNotificationEventKey(
  kind: Exclude<RewardGrantKind, 'ATTENDANCE'>,
  userId: string,
  threshold: number,
): string {
  return `ACHIEVEMENT_REWARD:${kind}:${userId}:${threshold}`;
}

export function shouldGrantDailyAttendance(input: {
  policy: Pick<RewardPolicySnapshot, 'attendanceEnabled'>;
  alreadyCheckedIn: boolean;
}): boolean {
  return input.policy.attendanceEnabled && !input.alreadyCheckedIn;
}

export function shouldGrantMilestone(input: {
  enabled: boolean;
  threshold: number;
  currentCount: number;
  alreadyGranted: boolean;
}): boolean {
  if (!input.enabled) return false;
  if (input.alreadyGranted) return false;
  if (input.threshold < 1) return false;
  return input.currentCount >= input.threshold;
}

export function normalizeRewardMilestones(raw: unknown, fallback: RewardMilestone[]): RewardMilestone[] {
  const parsed = parseRewardMilestones(raw);
  if (parsed.length === 0) return fallback;
  return parsed;
}

export function parseRewardMilestones(raw: unknown): RewardMilestone[] {
  if (!Array.isArray(raw)) return [];
  const byThreshold = new Map<number, RewardMilestone>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const threshold = Number((item as { threshold?: unknown }).threshold);
    const amount = String((item as { amount?: unknown }).amount ?? '');
    if (!Number.isInteger(threshold) || threshold < 1) continue;
    if (!isNonNegativeCoinAmount(amount)) continue;
    byThreshold.set(threshold, { threshold, amount });
  }
  return [...byThreshold.values()].sort((a, b) => a.threshold - b.threshold);
}

export function resolveRewardMilestones(policy: RewardPolicySnapshot): {
  host: RewardMilestone[];
  participation: RewardMilestone[];
} {
  return {
    host: normalizeRewardMilestones(policy.hostMilestones, [
      { threshold: policy.hostThreshold, amount: policy.hostAmount },
    ]),
    participation: normalizeRewardMilestones(policy.participationMilestones, [
      { threshold: policy.participationThreshold, amount: policy.participationAmount },
    ]),
  };
}

export function primaryMilestone(milestones: RewardMilestone[], fallback: RewardMilestone): RewardMilestone {
  return milestones[0] ?? fallback;
}

export function listGrantableMilestones(input: {
  enabled: boolean;
  milestones: RewardMilestone[];
  currentCount: number;
  grantedThresholds: ReadonlySet<number>;
}): RewardMilestone[] {
  if (!input.enabled) return [];
  return input.milestones.filter((milestone) =>
    shouldGrantMilestone({
      enabled: true,
      threshold: milestone.threshold,
      currentCount: input.currentCount,
      alreadyGranted: input.grantedThresholds.has(milestone.threshold),
    }),
  );
}

export function milestoneProgressList(input: {
  currentCount: number;
  milestones: RewardMilestone[];
  grantedThresholds: ReadonlySet<number>;
}): RewardMilestoneProgress[] {
  return input.milestones.map((milestone) => {
    const progress = milestoneProgress(input.currentCount, milestone.threshold);
    return {
      threshold: milestone.threshold,
      amount: milestone.amount,
      remaining: progress.remaining,
      reached: progress.reached,
      granted: input.grantedThresholds.has(milestone.threshold),
    };
  });
}

export function nextAttendanceStreak(input: {
  lastCheckInKstDate: string | null;
  previousCurrentStreak: number;
  previousBestStreak: number;
  previousTotalDays: number;
  todayKst: string;
}): AttendanceStreakSnapshot {
  if (input.lastCheckInKstDate === input.todayKst) {
    return {
      currentStreak: Math.max(0, input.previousCurrentStreak),
      bestStreak: Math.max(0, input.previousBestStreak, input.previousCurrentStreak),
      totalDays: Math.max(0, input.previousTotalDays),
    };
  }
  const yesterday = shiftKstDateKey(input.todayKst, -1);
  const currentStreak =
    input.lastCheckInKstDate === yesterday ? Math.max(1, input.previousCurrentStreak + 1) : 1;
  const totalDays = Math.max(0, input.previousTotalDays) + 1;
  const bestStreak = Math.max(0, input.previousBestStreak, currentStreak);
  return { currentStreak, bestStreak, totalDays };
}

/** Recompute streak from durable check-in date keys (source of truth). */
export function computeAttendanceStreakFromDates(
  dates: readonly string[],
  todayKst: string,
): AttendanceStreakSnapshot {
  const unique = [...new Set(dates.filter(isValidKstDateKey))].sort();
  const totalDays = unique.length;
  if (totalDays === 0) {
    return { currentStreak: 0, bestStreak: 0, totalDays: 0 };
  }

  let bestStreak = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    if (unique[i] === shiftKstDateKey(unique[i - 1], 1)) {
      run += 1;
      if (run > bestStreak) bestStreak = run;
    } else {
      run = 1;
    }
  }

  const last = unique[unique.length - 1];
  const yesterday = shiftKstDateKey(todayKst, -1);
  if (last !== todayKst && last !== yesterday) {
    return { currentStreak: 0, bestStreak, totalDays };
  }

  let currentStreak = 1;
  for (let i = unique.length - 1; i > 0; i -= 1) {
    if (unique[i] === shiftKstDateKey(unique[i - 1], 1)) {
      currentStreak += 1;
    } else {
      break;
    }
  }
  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak), totalDays };
}

export function attendanceRewardToast(input: {
  granted: boolean;
  amount: string;
  currentStreak: number;
}): RewardToastCopy | null {
  if (!input.granted) return null;
  const streak = Math.max(1, input.currentStreak);
  return {
    title: '오늘 출석 완료',
    body:
      Number(input.amount) > 0
        ? `${input.amount}코인 지급 · 연속 ${streak}일`
        : `연속 ${streak}일 출석`,
  };
}

export function achievementRewardToast(input: {
  kind: Exclude<RewardGrantKind, 'ATTENDANCE'>;
  threshold: number;
  amount: string;
}): RewardToastCopy {
  const label = input.kind === 'HOST_MILESTONE' ? '호스트' : '참가';
  return {
    title: `${label} 업적 달성`,
    body: `${input.threshold}회 성사 · ${input.amount}코인 지급`,
  };
}

export function validateRewardPolicy(
  input: RewardPolicySnapshot,
): { ok: true } | { ok: false; code: string } {
  const amounts = [input.attendanceAmount, input.hostAmount, input.participationAmount];
  for (const amount of amounts) {
    if (!isNonNegativeCoinAmount(amount)) return { ok: false, code: 'invalid_reward_amount' };
  }
  if (!Number.isInteger(input.hostThreshold) || input.hostThreshold < 1) {
    return { ok: false, code: 'invalid_host_threshold' };
  }
  if (!Number.isInteger(input.participationThreshold) || input.participationThreshold < 1) {
    return { ok: false, code: 'invalid_participation_threshold' };
  }
  const hostMilestones = parseRewardMilestones(input.hostMilestones);
  const participationMilestones = parseRewardMilestones(input.participationMilestones);
  if (input.hostMilestones.length > 0 && hostMilestones.length === 0) {
    return { ok: false, code: 'invalid_host_milestones' };
  }
  if (input.participationMilestones.length > 0 && participationMilestones.length === 0) {
    return { ok: false, code: 'invalid_participation_milestones' };
  }
  return { ok: true };
}

export function milestoneProgress(
  currentCount: number,
  threshold: number,
): {
  currentCount: number;
  threshold: number;
  remaining: number;
  reached: boolean;
} {
  const safeThreshold = Math.max(1, threshold);
  const safeCount = Math.max(0, currentCount);
  return {
    currentCount: safeCount,
    threshold: safeThreshold,
    remaining: Math.max(0, safeThreshold - safeCount),
    reached: safeCount >= safeThreshold,
  };
}

function isNonNegativeCoinAmount(amount: string): boolean {
  const n = Number(amount);
  return Number.isFinite(n) && n >= 0;
}
