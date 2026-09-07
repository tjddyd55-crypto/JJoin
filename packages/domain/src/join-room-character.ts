import {
  formatJoinAfterPlanCardLabel,
  normalizeJoinAfterPlan,
  validateJoinAfterPlan,
  type JoinAfterPlan,
} from './join-after-plan';
import {
  formatJoinGameStyleCardLabel,
  normalizeJoinGameStyle,
  validateJoinGameStyle,
  type JoinGameStyle,
} from './join-game-style';
import {
  formatJoinParticipantSkillCardLabel,
  normalizeJoinParticipantSkill,
  validateJoinParticipantSkill,
  type JoinParticipantSkillInput,
  type JoinParticipantSkillMode,
} from './join-participant-skill';

export type JoinRoomCharacterInput = JoinParticipantSkillInput & {
  gameStyle?: JoinGameStyle | null;
  gameMemo?: string | null;
  afterPlan?: JoinAfterPlan | null;
  afterMemo?: string | null;
};

export function normalizeJoinRoomCharacter(input: JoinRoomCharacterInput) {
  return {
    ...normalizeJoinParticipantSkill(input),
    ...normalizeJoinGameStyle(input),
    ...normalizeJoinAfterPlan(input),
  };
}

export function validateJoinRoomCharacter(
  input: JoinRoomCharacterInput,
): { ok: true } | { ok: false; code: string } {
  const skill = validateJoinParticipantSkill(input);
  if (!skill.ok) return skill;
  const game = validateJoinGameStyle(input);
  if (!game.ok) return game;
  const after = validateJoinAfterPlan(input);
  if (!after.ok) return after;
  return { ok: true };
}

export function buildJoinCardCharacterTags(input: {
  participantSkillMode?: JoinParticipantSkillMode | null;
  minScreenHandicap?: number | null;
  maxScreenHandicap?: number | null;
  gameStyle?: JoinGameStyle | null;
  afterPlan?: JoinAfterPlan | null;
}): string[] {
  const tags: string[] = [];
  const skill = formatJoinParticipantSkillCardLabel(
    input.participantSkillMode,
    input.minScreenHandicap,
    input.maxScreenHandicap,
  );
  if (skill) tags.push(skill);
  const game = formatJoinGameStyleCardLabel(input.gameStyle);
  if (game) tags.push(game);
  const after = formatJoinAfterPlanCardLabel(input.afterPlan);
  if (after) tags.push(after);
  return tags;
}
