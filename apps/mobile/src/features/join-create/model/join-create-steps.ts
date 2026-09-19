import {
  validateJoinCapacityForTrack,
  validateJoinPlayFormat,
  type JoinPlayFormat,
  type JoinVenueType,
} from '@jjoin/domain';

export type JoinCreateStepId =
  | 'venue'
  | 'capacity'
  | 'cost'
  | 'benefits'
  | 'members'
  | 'options'
  | 'confirm';

export const JOIN_CREATE_STEPS: Array<{ id: JoinCreateStepId; label: string }> = [
  { id: 'venue', label: '장소·일정' },
  { id: 'capacity', label: '인원·비용' },
  { id: 'members', label: '원하는 멤버' },
  { id: 'options', label: '옵션' },
  { id: 'confirm', label: '확인' },
];

export const FIELD_JOIN_CREATE_STEPS: Array<{ id: JoinCreateStepId; label: string }> = [
  { id: 'venue', label: '코스·티타임' },
  { id: 'capacity', label: '모집 조건' },
  { id: 'cost', label: '그린피' },
  { id: 'benefits', label: '혜택' },
  { id: 'options', label: '코인·옵션' },
  { id: 'confirm', label: '확인' },
];

export function joinCreateStepsForTrack(
  venueType: JoinVenueType,
): Array<{ id: JoinCreateStepId; label: string }> {
  return venueType === 'FIELD' ? FIELD_JOIN_CREATE_STEPS : JOIN_CREATE_STEPS;
}

export function joinCreateStepIndex(
  step: JoinCreateStepId,
  steps: Array<{ id: JoinCreateStepId }> = JOIN_CREATE_STEPS,
): number {
  return steps.findIndex((s) => s.id === step);
}

export function canAdvanceJoinCreateStep(
  step: JoinCreateStepId,
  args: {
    venueReady: boolean;
    startAtValid: boolean;
    players: number;
    playFormat?: JoinPlayFormat;
    teamSize?: number | null;
    teamCount?: number | null;
    venueType?: JoinVenueType;
    costValid?: boolean;
  },
): boolean {
  switch (step) {
    case 'venue':
      return args.venueReady && args.startAtValid;
    case 'capacity':
      return validateJoinCapacityForTrack({
        playFormat: args.playFormat ?? 'INDIVIDUAL',
        plannedPlayerCount: args.players,
        teamSize: args.teamSize,
        teamCount: args.teamCount,
        venueType: args.venueType ?? 'SCREEN',
      }).ok;
    case 'cost':
      return args.costValid !== false;
    case 'benefits':
      return true;
    case 'members':
    case 'options':
      return true;
    case 'confirm':
      return args.venueReady && args.startAtValid;
    default:
      return false;
  }
}

export function canAdvanceScreenCreateStep(
  step: JoinCreateStepId,
  args: Parameters<typeof canAdvanceJoinCreateStep>[1],
): boolean {
  return canAdvanceJoinCreateStep(step, { ...args, venueType: 'SCREEN' });
}

/** SCREEN capacity helper used by existing tests that do not pass venueType. */
export function validateScreenCreateCapacity(args: {
  players: number;
  playFormat?: JoinPlayFormat;
  teamSize?: number | null;
  teamCount?: number | null;
}): boolean {
  return validateJoinPlayFormat({
    playFormat: args.playFormat ?? 'INDIVIDUAL',
    plannedPlayerCount: args.players,
    teamSize: args.teamSize,
    teamCount: args.teamCount,
  }).ok;
}
