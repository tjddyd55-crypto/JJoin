/**
 * Track-specific join capacity SSOT.
 * SCREEN keeps the existing 2–8 / TEAM 2–16 rules.
 * FIELD v1 is singles 2/3/4 or foursome 2v2 (total 4). 6 / 3v3 is future multi-group.
 */

import {
  INDIVIDUAL_MAX_PLAYERS,
  INDIVIDUAL_MIN_PLAYERS,
  TEAM_COUNT_MAX,
  TEAM_COUNT_MIN,
  TEAM_MAX_PLAYERS,
  TEAM_SIZE_MAX,
  TEAM_SIZE_MIN,
  validateJoinPlayFormat,
  type JoinPlayFormatInput,
  type JoinPlayFormatValidation,
  type NormalizedJoinPlayFormat,
} from './join-play-format';
import type { JoinVenueType } from './venue-type';

export const SCREEN_ALLOWED_INDIVIDUAL_CAPACITIES = [2, 3, 4, 5, 6, 7, 8] as const;
export const FIELD_ALLOWED_INDIVIDUAL_CAPACITIES = [2, 3, 4] as const;

export const SCREEN_ALLOWED_CAPACITIES = {
  individual: SCREEN_ALLOWED_INDIVIDUAL_CAPACITIES,
  teamSizeMin: TEAM_SIZE_MIN,
  teamSizeMax: TEAM_SIZE_MAX,
  teamCountMin: TEAM_COUNT_MIN,
  teamCountMax: TEAM_COUNT_MAX,
  teamMaxPlayers: TEAM_MAX_PLAYERS,
} as const;

export const FIELD_V1_FOURSOME = {
  label: '2v2',
  teamSize: 2,
  teamCount: 2,
  plannedPlayerCount: 4,
} as const;

export const FIELD_ALLOWED_CAPACITIES = {
  individual: FIELD_ALLOWED_INDIVIDUAL_CAPACITIES,
  foursome: FIELD_V1_FOURSOME,
} as const;

/** Catalog only — 3v3 is not creatable in FIELD v1. */
export const FIELD_FUTURE_MULTI_GROUP_PRESETS = [
  { label: '3v3', teamSize: 3, teamCount: 2, plannedPlayerCount: 6 },
] as const;

export function isScreenIndividualCapacity(count: number): boolean {
  return SCREEN_ALLOWED_INDIVIDUAL_CAPACITIES.includes(
    count as (typeof SCREEN_ALLOWED_INDIVIDUAL_CAPACITIES)[number],
  );
}

export function isFieldIndividualCapacity(count: number): boolean {
  return FIELD_ALLOWED_INDIVIDUAL_CAPACITIES.includes(
    count as (typeof FIELD_ALLOWED_INDIVIDUAL_CAPACITIES)[number],
  );
}

export function isFieldV1Foursome(input: {
  teamSize?: number | null;
  teamCount?: number | null;
  plannedPlayerCount?: number | null;
}): boolean {
  return (
    input.teamSize === FIELD_V1_FOURSOME.teamSize &&
    input.teamCount === FIELD_V1_FOURSOME.teamCount &&
    (input.plannedPlayerCount == null ||
      input.plannedPlayerCount === FIELD_V1_FOURSOME.plannedPlayerCount)
  );
}

export function validateFieldJoinCapacity(
  value: NormalizedJoinPlayFormat,
): JoinPlayFormatValidation {
  if (value.playFormat === 'INDIVIDUAL') {
    if (!isFieldIndividualCapacity(value.plannedPlayerCount)) {
      return { ok: false, code: 'field_capacity_not_allowed' };
    }
    return { ok: true, value };
  }
  if (!isFieldV1Foursome(value)) {
    return { ok: false, code: 'field_foursome_v1_2v2_only' };
  }
  return { ok: true, value };
}

export function validateJoinCapacityForTrack(
  input: JoinPlayFormatInput & { venueType?: JoinVenueType | null },
): JoinPlayFormatValidation {
  const base = validateJoinPlayFormat(input);
  if (!base.ok) return base;
  if ((input.venueType ?? 'SCREEN') !== 'FIELD') return base;
  return validateFieldJoinCapacity(base.value);
}

export function assertScreenCapacityUnchanged(): void {
  if (INDIVIDUAL_MIN_PLAYERS !== 2 || INDIVIDUAL_MAX_PLAYERS !== 8) {
    throw new Error('SCREEN individual capacity SSOT drifted');
  }
  if (SCREEN_ALLOWED_INDIVIDUAL_CAPACITIES[0] !== 2) {
    throw new Error('SCREEN_ALLOWED_CAPACITIES drifted');
  }
}
