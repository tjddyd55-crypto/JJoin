export type JoinCreateStepId =
  | 'venue'
  | 'capacity'
  | 'members'
  | 'options'
  | 'confirm';

export const JOIN_CREATE_STEPS: Array<{ id: JoinCreateStepId; label: string }> = [
  { id: 'venue', label: '장소·일정' },
  { id: 'capacity', label: '인원·비용' },
  { id: 'members', label: '모집 조건' },
  { id: 'options', label: '옵션' },
  { id: 'confirm', label: '확인' },
];

export function joinCreateStepIndex(step: JoinCreateStepId): number {
  return JOIN_CREATE_STEPS.findIndex((s) => s.id === step);
}

export function canAdvanceJoinCreateStep(
  step: JoinCreateStepId,
  args: {
    venueReady: boolean;
    startAtValid: boolean;
    players: number;
  },
): boolean {
  switch (step) {
    case 'venue':
      return args.venueReady && args.startAtValid;
    case 'capacity':
      return args.players >= 2 && args.players <= 4;
    case 'members':
    case 'options':
      return true;
    case 'confirm':
      return args.venueReady && args.startAtValid;
    default:
      return false;
  }
}
