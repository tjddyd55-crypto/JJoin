/**
 * Join Create screen session helpers.
 * Success UI may stay while the screen stays focused; a later re-entry must start fresh.
 */

export type JoinCreateFormDefaults = {
  players: number;
  rewardPerParticipant: string;
};

export const JOIN_CREATE_FORM_DEFAULTS: JoinCreateFormDefaults = {
  players: 4,
  rewardPerParticipant: '0',
};

/** True when Create screen focus should wipe a prior completed-success session. */
export function shouldResetJoinCreateSession(args: {
  /** Set on blur while success UI was active; consumed on next focus. */
  pendingNewSession: boolean;
}): boolean {
  return args.pendingNewSession;
}

export function resolveJoinCreatePlayersFromParams(playersParam: string | undefined): number {
  const n = Number(playersParam);
  return Number.isFinite(n) && n >= 2 ? Math.floor(n) : JOIN_CREATE_FORM_DEFAULTS.players;
}

export function resolveJoinCreateRewardFromParams(
  rewardParam: string | undefined,
): string {
  return rewardParam && rewardParam.trim()
    ? rewardParam
    : JOIN_CREATE_FORM_DEFAULTS.rewardPerParticipant;
}
