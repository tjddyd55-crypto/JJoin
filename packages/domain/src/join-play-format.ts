/**
 * Join play format — INDIVIDUAL (flat roster) vs TEAM (foursome/team).
 * plannedPlayerCount remains the capacity SSOT; TEAM derives it from teamSize * teamCount.
 */

export const JOIN_PLAY_FORMATS = ['INDIVIDUAL', 'TEAM'] as const;
export type JoinPlayFormat = (typeof JOIN_PLAY_FORMATS)[number];

export const INDIVIDUAL_MIN_PLAYERS = 2;
export const INDIVIDUAL_MAX_PLAYERS = 8;
export const TEAM_SIZE_MIN = 2;
export const TEAM_SIZE_MAX = 6;
export const TEAM_COUNT_MIN = 2;
export const TEAM_COUNT_MAX = 8;
export const TEAM_MAX_PLAYERS = 16;

export type JoinPlayFormatInput = {
  playFormat?: JoinPlayFormat | null;
  plannedPlayerCount?: number | null;
  teamSize?: number | null;
  teamCount?: number | null;
};

export type NormalizedJoinPlayFormat = {
  playFormat: JoinPlayFormat;
  plannedPlayerCount: number;
  teamSize: number | null;
  teamCount: number | null;
};

export type JoinPlayFormatValidation =
  | { ok: true; value: NormalizedJoinPlayFormat }
  | { ok: false; code: string };

export function isJoinPlayFormat(value: unknown): value is JoinPlayFormat {
  return value === 'INDIVIDUAL' || value === 'TEAM';
}

export function resolvePlannedPlayerCount(input: {
  playFormat: JoinPlayFormat;
  plannedPlayerCount?: number | null;
  teamSize?: number | null;
  teamCount?: number | null;
}): number {
  if (input.playFormat === 'TEAM') {
    const size = input.teamSize ?? 0;
    const count = input.teamCount ?? 0;
    return size * count;
  }
  return input.plannedPlayerCount ?? 0;
}

export function validateJoinPlayFormat(input: JoinPlayFormatInput): JoinPlayFormatValidation {
  const playFormat = input.playFormat ?? 'INDIVIDUAL';
  if (!isJoinPlayFormat(playFormat)) {
    return { ok: false, code: 'invalid_play_format' };
  }

  if (playFormat === 'INDIVIDUAL') {
    const planned = input.plannedPlayerCount ?? 0;
    if (!Number.isInteger(planned) || planned < INDIVIDUAL_MIN_PLAYERS || planned > INDIVIDUAL_MAX_PLAYERS) {
      return { ok: false, code: 'invalid_planned_player_count' };
    }
    return {
      ok: true,
      value: {
        playFormat: 'INDIVIDUAL',
        plannedPlayerCount: planned,
        teamSize: null,
        teamCount: null,
      },
    };
  }

  const teamSize = input.teamSize ?? null;
  const teamCount = input.teamCount ?? null;
  if (teamSize == null || teamCount == null) {
    return { ok: false, code: 'team_size_and_count_required' };
  }
  if (!Number.isInteger(teamSize) || teamSize < TEAM_SIZE_MIN || teamSize > TEAM_SIZE_MAX) {
    return { ok: false, code: 'invalid_team_size' };
  }
  if (!Number.isInteger(teamCount) || teamCount < TEAM_COUNT_MIN || teamCount > TEAM_COUNT_MAX) {
    return { ok: false, code: 'invalid_team_count' };
  }
  const planned = teamSize * teamCount;
  if (planned < TEAM_SIZE_MIN * TEAM_COUNT_MIN || planned > TEAM_MAX_PLAYERS) {
    return { ok: false, code: 'invalid_team_capacity' };
  }
  return {
    ok: true,
    value: {
      playFormat: 'TEAM',
      plannedPlayerCount: planned,
      teamSize,
      teamCount,
    },
  };
}

export function validateTeamAssignment(input: {
  playFormat: JoinPlayFormat;
  teamCount: number | null;
  teamIndex: number | null | undefined;
}): { ok: true; teamIndex: number | null } | { ok: false; code: string } {
  if (input.playFormat !== 'TEAM') {
    return { ok: true, teamIndex: null };
  }
  if (input.teamIndex == null) {
    return { ok: true, teamIndex: null };
  }
  const count = input.teamCount ?? 0;
  if (!Number.isInteger(input.teamIndex) || input.teamIndex < 0 || input.teamIndex >= count) {
    return { ok: false, code: 'invalid_team_index' };
  }
  return { ok: true, teamIndex: input.teamIndex };
}

export function formatPlayFormatLabel(playFormat: JoinPlayFormat): string {
  return playFormat === 'TEAM' ? '팀전' : '개인전';
}

export function formatTeamCapacityLabel(input: {
  teamSize: number | null;
  teamCount: number | null;
}): string | null {
  if (input.teamSize == null || input.teamCount == null) return null;
  return `${input.teamCount}팀 × ${input.teamSize}명`;
}
