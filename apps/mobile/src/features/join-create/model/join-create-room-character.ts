import {
  AFTER_MEMO_CUSTOM_PRESET_LABEL,
  AFTER_MEMO_PRESETS,
  DEFAULT_HANDICAP_RANGE_MAX,
  DEFAULT_HANDICAP_RANGE_MIN,
  GAME_MEMO_CUSTOM_PRESET_LABEL,
  GAME_MEMO_PRESETS,
  formatJoinAfterPlanLabel,
  formatJoinGameStyleLabel,
  formatJoinParticipantSkillDetailLabel,
  normalizeJoinRoomCharacter,
  type JoinAfterPlan,
  type JoinGameStyle,
  type JoinParticipantSkillMode,
} from '@jjoin/domain';
import {
  JoinAfterPlan as JoinAfterPlanEnum,
  JoinGameStyle as JoinGameStyleEnum,
  JoinParticipantSkillMode as JoinParticipantSkillModeEnum,
  type JoinRoomCharacterFields,
} from '@jjoin/types';
export type JoinCreateRoomCharacterState = {
  participantSkillMode: JoinParticipantSkillMode;
  minScreenHandicap: number;
  maxScreenHandicap: number;
  gameStyle: JoinGameStyle;
  gameMemo: string;
  afterPlan: JoinAfterPlan;
  afterMemo: string;
};

export function defaultJoinCreateRoomCharacter(): JoinCreateRoomCharacterState {
  return {
    participantSkillMode: JoinParticipantSkillModeEnum.ANY,
    minScreenHandicap: DEFAULT_HANDICAP_RANGE_MIN,
    maxScreenHandicap: DEFAULT_HANDICAP_RANGE_MAX,
    gameStyle: 'FRIENDLY',
    gameMemo: '',
    afterPlan: 'NONE',
    afterMemo: '',
  };
}

export function joinRoomCharacterPayload(value: JoinCreateRoomCharacterState): JoinRoomCharacterFields {
  const normalized = normalizeJoinRoomCharacter({
    participantSkillMode: value.participantSkillMode,
    minScreenHandicap:
      value.participantSkillMode === 'HANDICAP_RANGE' ? value.minScreenHandicap : null,
    maxScreenHandicap:
      value.participantSkillMode === 'HANDICAP_RANGE' ? value.maxScreenHandicap : null,
    gameStyle: value.gameStyle,
    gameMemo: value.gameStyle === 'LIGHT_GAME' ? value.gameMemo : null,
    afterPlan: value.afterPlan,
    afterMemo: value.afterPlan === 'MEAL_OR_DRINK' ? value.afterMemo : null,
  });
  return {
    participantSkillMode: normalized.participantSkillMode as JoinParticipantSkillModeEnum,
    minScreenHandicap: normalized.minScreenHandicap,
    maxScreenHandicap: normalized.maxScreenHandicap,
    gameStyle: normalized.gameStyle as JoinGameStyleEnum,
    gameMemo: normalized.gameMemo,
    afterPlan: normalized.afterPlan as JoinAfterPlanEnum,
    afterMemo: normalized.afterMemo,
  };
}

export function joinRoomCharacterFromDetail(detail: JoinRoomCharacterFields): JoinCreateRoomCharacterState {
  const defaults = defaultJoinCreateRoomCharacter();
  return {
    participantSkillMode: detail.participantSkillMode ?? defaults.participantSkillMode,
    minScreenHandicap: detail.minScreenHandicap ?? defaults.minScreenHandicap,
    maxScreenHandicap: detail.maxScreenHandicap ?? defaults.maxScreenHandicap,
    gameStyle: detail.gameStyle ?? defaults.gameStyle,
    gameMemo: detail.gameMemo ?? '',
    afterPlan: detail.afterPlan ?? defaults.afterPlan,
    afterMemo: detail.afterMemo ?? '',
  };
}

export function joinRoomCharacterSummaryLines(value: JoinCreateRoomCharacterState): string[] {
  const lines: string[] = [];
  const skill = formatJoinParticipantSkillDetailLabel(
    value.participantSkillMode,
    value.participantSkillMode === 'HANDICAP_RANGE' ? value.minScreenHandicap : null,
    value.participantSkillMode === 'HANDICAP_RANGE' ? value.maxScreenHandicap : null,
  );
  if (skill) lines.push(skill);
  lines.push(formatJoinGameStyleLabel(value.gameStyle));
  if (value.gameStyle === 'LIGHT_GAME' && value.gameMemo.trim()) {
    lines.push(value.gameMemo.trim());
  }
  lines.push(`애프터: ${formatJoinAfterPlanLabel(value.afterPlan)}`);
  if (value.afterPlan === 'MEAL_OR_DRINK' && value.afterMemo.trim()) {
    lines.push(value.afterMemo.trim());
  }
  return lines;
}

export {
  GAME_MEMO_PRESETS,
  GAME_MEMO_CUSTOM_PRESET_LABEL,
  AFTER_MEMO_PRESETS,
  AFTER_MEMO_CUSTOM_PRESET_LABEL,
};
