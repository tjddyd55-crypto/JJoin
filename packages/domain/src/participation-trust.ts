/**
 * Participation trust — objective behavior metrics + explainable labels.
 * SSOT for profile, participant rows, and host roster displays.
 */

import { computeAttendanceReliability } from './attendance-reliability';

export type ParticipationTrustLabelId = 'NEW' | 'STABLE' | 'VERY_STABLE' | 'CAUTION';

export const PARTICIPATION_TRUST_LABEL_KO: Record<ParticipationTrustLabelId, string> = {
  NEW: '신규',
  STABLE: '안정적',
  VERY_STABLE: '매우 안정적',
  CAUTION: '주의',
};

export type ParticipationTrustMetrics = {
  joinedCount: number;
  attendedCount: number;
  noShowCount: number;
  cancelledCount: number;
  attendanceRate: number | null;
  attendanceRatePercent: number | null;
  playedTogetherCount: number | null;
};

export type ParticipationTrust = ParticipationTrustMetrics & {
  label: ParticipationTrustLabelId | null;
  labelText: string | null;
};

const MIN_SAMPLE_FOR_LABEL = 3;
const MIN_SAMPLE_FOR_CAUTION = 5;

export function calculateParticipationTrust(input: {
  joinedCount: number;
  attendedCount: number;
  noShowCount: number;
  cancelledCount?: number;
  playedTogetherCount?: number | null;
}): ParticipationTrust {
  const joinedCount = Math.max(0, Math.floor(input.joinedCount));
  const attendedCount = Math.max(0, Math.floor(input.attendedCount));
  const noShowCount = Math.max(0, Math.floor(input.noShowCount));
  const cancelledCount = Math.max(0, Math.floor(input.cancelledCount ?? 0));

  const reliability = computeAttendanceReliability({
    completedCount: attendedCount,
    noShowCount,
  });

  let label: ParticipationTrustLabelId | null = null;
  const settledCount = attendedCount + noShowCount;

  if (joinedCount < MIN_SAMPLE_FOR_LABEL || settledCount === 0) {
    label = 'NEW';
  } else if (reliability.attendanceRate != null) {
    const rate = reliability.attendanceRate;
    const noShowRate = settledCount > 0 ? noShowCount / settledCount : 0;

    if (
      noShowCount >= 2 &&
      noShowRate >= 0.25 &&
      settledCount >= MIN_SAMPLE_FOR_CAUTION
    ) {
      label = 'CAUTION';
    } else if (rate >= 0.95 && settledCount >= 5) {
      label = 'VERY_STABLE';
    } else if (rate >= 0.8) {
      label = 'STABLE';
    } else if (rate < 0.7 && settledCount >= MIN_SAMPLE_FOR_CAUTION) {
      label = 'CAUTION';
    } else {
      label = 'STABLE';
    }
  }

  return {
    joinedCount,
    attendedCount,
    noShowCount,
    cancelledCount,
    attendanceRate: reliability.attendanceRate,
    attendanceRatePercent: reliability.attendanceRatePercent,
    playedTogetherCount: input.playedTogetherCount ?? null,
    label,
    labelText: label ? PARTICIPATION_TRUST_LABEL_KO[label] : null,
  };
}

/** Alias for API/domain callers — single entry point per lifecycle spec. */
export const computeParticipationTrust = calculateParticipationTrust;
