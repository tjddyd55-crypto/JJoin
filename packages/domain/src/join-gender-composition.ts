import type { MatchingGender, MatchingRosterCounts } from './store-matching';

export type JoinGenderCompositionMode = 'ANY' | 'FIXED';

export const STANDARD_GENDER_ROSTER_STATUSES = [
  'APPROVED',
  'CONFIRMED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export type StandardGenderRosterParticipant = {
  role: string;
  participationStatus: string;
  gender?: MatchingGender | null;
};

export function resolveGenderCompositionMode(
  targetMaleCount: number | null | undefined,
  targetFemaleCount: number | null | undefined,
): JoinGenderCompositionMode {
  if (targetMaleCount == null || targetFemaleCount == null) return 'ANY';
  if (targetMaleCount + targetFemaleCount < 1) return 'ANY';
  return 'FIXED';
}

export function hasFixedGenderComposition(
  targetMaleCount: number | null | undefined,
  targetFemaleCount: number | null | undefined,
): boolean {
  return resolveGenderCompositionMode(targetMaleCount, targetFemaleCount) === 'FIXED';
}

export function normalizeFixedGenderComposition(
  totalCapacity: number,
  maleCapacity: number,
): { targetMaleCount: number; targetFemaleCount: number } {
  if (!Number.isInteger(totalCapacity) || totalCapacity < 2) {
    throw new Error('invalid_total_capacity');
  }
  const male = Math.max(0, Math.min(totalCapacity, Math.trunc(maleCapacity)));
  const female = totalCapacity - male;
  return { targetMaleCount: male, targetFemaleCount: female };
}

export function validateFixedGenderComposition(params: {
  totalCapacity: number;
  targetMaleCount: number;
  targetFemaleCount: number;
  hostGender?: MatchingGender | null;
}): { ok: true } | { ok: false; code: string } {
  const { totalCapacity, targetMaleCount, targetFemaleCount, hostGender } = params;
  if (targetMaleCount + targetFemaleCount !== totalCapacity) {
    return { ok: false, code: 'gender_composition_sum_mismatch' };
  }
  if (targetMaleCount < 0 || targetFemaleCount < 0) {
    return { ok: false, code: 'invalid_gender_composition' };
  }
  if (hostGender === 'MALE' && targetMaleCount < 1) {
    return { ok: false, code: 'host_gender_quota_required' };
  }
  if (hostGender === 'FEMALE' && targetFemaleCount < 1) {
    return { ok: false, code: 'host_gender_quota_required' };
  }
  return { ok: true };
}

export function countStandardGenderRoster(params: {
  participants: StandardGenderRosterParticipant[];
  hostGender?: MatchingGender | null;
}): MatchingRosterCounts {
  let male = 0;
  let female = 0;
  let other = 0;

  for (const participant of params.participants) {
    if (
      !STANDARD_GENDER_ROSTER_STATUSES.includes(
        participant.participationStatus as (typeof STANDARD_GENDER_ROSTER_STATUSES)[number],
      )
    ) {
      continue;
    }
    const gender =
      participant.role === 'HOST'
        ? (params.hostGender ?? participant.gender ?? null)
        : (participant.gender ?? null);
    if (gender === 'MALE') male += 1;
    else if (gender === 'FEMALE') female += 1;
    else other += 1;
  }

  return { male, female, other, total: male + female + other };
}

export function canApproveStandardGenderSlot(params: {
  applicantGender: MatchingGender;
  targetMaleCount: number;
  targetFemaleCount: number;
  participants: StandardGenderRosterParticipant[];
  hostGender?: MatchingGender | null;
}): boolean {
  const counts = countStandardGenderRoster({
    participants: params.participants,
    hostGender: params.hostGender,
  });
  const totalCapacity = params.targetMaleCount + params.targetFemaleCount;
  if (counts.total >= totalCapacity) return false;

  if (params.applicantGender === 'MALE') {
    return counts.male < params.targetMaleCount;
  }
  if (params.applicantGender === 'FEMALE') {
    return counts.female < params.targetFemaleCount;
  }
  return false;
}

export function validateStandardGenderCompositionEdit(params: {
  targetMaleCount: number;
  targetFemaleCount: number;
  currentMaleCount: number;
  currentFemaleCount: number;
}): { ok: true } | { ok: false; code: string } {
  if (params.targetMaleCount < params.currentMaleCount) {
    return { ok: false, code: 'gender_composition_below_current_male' };
  }
  if (params.targetFemaleCount < params.currentFemaleCount) {
    return { ok: false, code: 'gender_composition_below_current_female' };
  }
  return { ok: true };
}

export function formatStandardGenderCompositionLabel(
  targetMaleCount: number | null | undefined,
  targetFemaleCount: number | null | undefined,
): string | null {
  if (!hasFixedGenderComposition(targetMaleCount, targetFemaleCount)) return null;
  const male = targetMaleCount ?? 0;
  const female = targetFemaleCount ?? 0;
  if (male === 0 && female > 0) return `여 ${female}`;
  if (female === 0 && male > 0) return `남 ${male}`;
  return `남 ${male} / 여 ${female}`;
}

export function parseGenderCompositionPayload(input: {
  genderCompositionMode?: JoinGenderCompositionMode | null;
  targetMaleCount?: number | null;
  targetFemaleCount?: number | null;
  plannedPlayerCount: number;
}): { targetMaleCount: number | null; targetFemaleCount: number | null } {
  const mode =
    input.genderCompositionMode ??
    resolveGenderCompositionMode(input.targetMaleCount, input.targetFemaleCount);

  if (mode === 'ANY') {
    return { targetMaleCount: null, targetFemaleCount: null };
  }

  const male = input.targetMaleCount ?? 0;
  return normalizeFixedGenderComposition(input.plannedPlayerCount, male);
}
