/**
 * Daily attendance + host/participation milestone rewards.
 * Success SSOT: ParticipationStatus.COMPLETED (join participation lifecycle).
 */

export const REWARD_POLICY_SETTINGS_ID = 'default';

export const REWARD_GRANT_KINDS = [
  'ATTENDANCE',
  'HOST_MILESTONE',
  'PARTICIPATION_MILESTONE',
] as const;
export type RewardGrantKind = (typeof REWARD_GRANT_KINDS)[number];

export type RewardPolicySnapshot = {
  attendanceEnabled: boolean;
  attendanceAmount: string;
  hostEnabled: boolean;
  hostThreshold: number;
  hostAmount: string;
  participationEnabled: boolean;
  participationThreshold: number;
  participationAmount: string;
};

export const DEFAULT_REWARD_POLICY: RewardPolicySnapshot = {
  attendanceEnabled: true,
  attendanceAmount: '1',
  hostEnabled: true,
  hostThreshold: 5,
  hostAmount: '10',
  participationEnabled: true,
  participationThreshold: 5,
  participationAmount: '5',
};

export function isSuccessfulParticipationStatus(status: string): boolean {
  return status === 'COMPLETED';
}

export function isSuccessfulHostedJoin(joinStatus: string): boolean {
  return joinStatus === 'COMPLETED';
}

export function attendanceKstDateKey(parts: { year: number; month: number; day: number }): string {
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
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

export function shouldGrantDailyAttendance(input: {
  policy: RewardPolicySnapshot;
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

export function validateRewardPolicy(input: RewardPolicySnapshot): { ok: true } | { ok: false; code: string } {
  const amounts = [input.attendanceAmount, input.hostAmount, input.participationAmount];
  for (const amount of amounts) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return { ok: false, code: 'invalid_reward_amount' };
  }
  if (!Number.isInteger(input.hostThreshold) || input.hostThreshold < 1) {
    return { ok: false, code: 'invalid_host_threshold' };
  }
  if (!Number.isInteger(input.participationThreshold) || input.participationThreshold < 1) {
    return { ok: false, code: 'invalid_participation_threshold' };
  }
  return { ok: true };
}

export function milestoneProgress(currentCount: number, threshold: number): {
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
