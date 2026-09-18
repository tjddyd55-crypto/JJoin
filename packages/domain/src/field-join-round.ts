/**
 * FIELD round semantics — confirmed tee time, 9/18 holes, duration.
 * Course holeCount (master) is not the same as join roundHoles.
 */

import type { FieldRoundHoles, FieldTeeTimeMode } from './field-join-cost';
import { FIELD_V1_TEE_TIME_MODE } from './field-join-cost';

export const FIELD_ROUND_DURATION_MINUTES: Record<FieldRoundHoles, number> = {
  9: 150,
  18: 270,
};

export function fieldRoundDurationRule(holes: FieldRoundHoles): {
  strategy: 'FIXED_MINUTES';
  fixedMinutes: number;
} {
  return {
    strategy: 'FIXED_MINUTES',
    fixedMinutes: FIELD_ROUND_DURATION_MINUTES[holes],
  };
}

export function resolveFieldRoundHoles(value: number | null | undefined): FieldRoundHoles {
  return value === 9 ? 9 : 18;
}

export function isConfirmedTeeTimeMode(mode: FieldTeeTimeMode | null | undefined): boolean {
  return (mode ?? FIELD_V1_TEE_TIME_MODE) === FIELD_V1_TEE_TIME_MODE;
}

export type FieldOpenSeats = {
  total: number;
  confirmed: number;
  recruiting: number;
};

export function computeFieldOpenSeats(plannedPlayerCount: number, confirmedPlayerCount: number): FieldOpenSeats {
  const total = Math.max(0, plannedPlayerCount);
  const confirmed = Math.max(0, confirmedPlayerCount);
  return {
    total,
    confirmed,
    recruiting: Math.max(0, total - confirmed),
  };
}

export function formatFieldOpenSeatsLabel(seats: FieldOpenSeats): string {
  return `모집 ${seats.total} · 확정 ${seats.confirmed} · 남은 자리 ${seats.recruiting}`;
}

export function formatFieldTeeTimeModeLabel(mode: FieldTeeTimeMode): string {
  switch (mode) {
    case 'RECRUIT_FIRST':
      return '모집 후 티타임';
    case 'SOFT_WINDOW':
      return '시간대 모집';
    default:
      return '확정 티타임';
  }
}
