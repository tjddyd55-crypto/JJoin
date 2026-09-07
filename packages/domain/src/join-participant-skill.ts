import { clampScreenHandicap, SCREEN_HANDICAP_MAX, SCREEN_HANDICAP_MIN } from './screen-handicap';

export const JOIN_PARTICIPANT_SKILL_MODES = ['ANY', 'BEGINNER_OK', 'HANDICAP_RANGE'] as const;
export type JoinParticipantSkillMode = (typeof JOIN_PARTICIPANT_SKILL_MODES)[number];

export const DEFAULT_HANDICAP_RANGE_MIN = 0;
export const DEFAULT_HANDICAP_RANGE_MAX = 15;

export type JoinParticipantSkillInput = {
  participantSkillMode?: JoinParticipantSkillMode | null;
  minScreenHandicap?: number | null;
  maxScreenHandicap?: number | null;
};

export function normalizeJoinParticipantSkill(
  input: JoinParticipantSkillInput,
): {
  participantSkillMode: JoinParticipantSkillMode;
  minScreenHandicap: number | null;
  maxScreenHandicap: number | null;
} {
  const mode = input.participantSkillMode ?? 'ANY';
  if (mode !== 'HANDICAP_RANGE') {
    return { participantSkillMode: mode, minScreenHandicap: null, maxScreenHandicap: null };
  }
  const min = clampScreenHandicap(
    input.minScreenHandicap ?? DEFAULT_HANDICAP_RANGE_MIN,
    SCREEN_HANDICAP_MIN,
    SCREEN_HANDICAP_MAX,
  );
  const max = clampScreenHandicap(
    input.maxScreenHandicap ?? DEFAULT_HANDICAP_RANGE_MAX,
    SCREEN_HANDICAP_MIN,
    SCREEN_HANDICAP_MAX,
  );
  if (min > max) {
    return { participantSkillMode: mode, minScreenHandicap: max, maxScreenHandicap: min };
  }
  return { participantSkillMode: mode, minScreenHandicap: min, maxScreenHandicap: max };
}

export function validateJoinParticipantSkill(
  input: JoinParticipantSkillInput,
): { ok: true } | { ok: false; code: string } {
  const mode = input.participantSkillMode ?? 'ANY';
  if (!JOIN_PARTICIPANT_SKILL_MODES.includes(mode)) {
    return { ok: false, code: 'invalid_participant_skill_mode' };
  }
  if (mode !== 'HANDICAP_RANGE') return { ok: true };

  const min = input.minScreenHandicap;
  const max = input.maxScreenHandicap;
  if (min == null || max == null) return { ok: false, code: 'handicap_range_required' };
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return { ok: false, code: 'invalid_handicap_range' };
  }
  if (min < SCREEN_HANDICAP_MIN || max > SCREEN_HANDICAP_MAX) {
    return { ok: false, code: 'handicap_range_out_of_bounds' };
  }
  if (min > max) return { ok: false, code: 'invalid_handicap_range' };
  return { ok: true };
}

export function formatScreenHandicapRange(
  min: number | null,
  max: number | null,
): string | null {
  if (min == null || max == null) return null;
  return `핸디 ${min}~${max}`;
}

export function formatJoinParticipantSkillCardLabel(
  mode: JoinParticipantSkillMode | null | undefined,
  minScreenHandicap: number | null | undefined,
  maxScreenHandicap: number | null | undefined,
): string | null {
  switch (mode ?? 'ANY') {
    case 'BEGINNER_OK':
      return '초보 가능';
    case 'HANDICAP_RANGE': {
      const range = formatScreenHandicapRange(
        minScreenHandicap ?? null,
        maxScreenHandicap ?? null,
      );
      return range ? `⛳ ${range}` : null;
    }
    default:
      return null;
  }
}

export function formatJoinParticipantSkillDetailLabel(
  mode: JoinParticipantSkillMode | null | undefined,
  minScreenHandicap: number | null | undefined,
  maxScreenHandicap: number | null | undefined,
): string | null {
  switch (mode ?? 'ANY') {
    case 'ANY':
      return '실력 상관없음';
    case 'BEGINNER_OK':
      return '초보 가능';
    case 'HANDICAP_RANGE': {
      const range = formatScreenHandicapRange(
        minScreenHandicap ?? null,
        maxScreenHandicap ?? null,
      );
      return range ?? '핸디 범위 지정';
    }
    default:
      return null;
  }
}

export function handicapToTrackRatio(
  handicap: number,
  min = SCREEN_HANDICAP_MIN,
  max = SCREEN_HANDICAP_MAX,
): number {
  if (max <= min) return 0;
  return (clampScreenHandicap(handicap, min, max) - min) / (max - min);
}

export function trackRatioToHandicap(
  ratio: number,
  min = SCREEN_HANDICAP_MIN,
  max = SCREEN_HANDICAP_MAX,
): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  return Math.round(min + clamped * (max - min));
}
