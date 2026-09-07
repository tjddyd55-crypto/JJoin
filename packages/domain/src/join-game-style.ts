export const JOIN_GAME_STYLES = ['FRIENDLY', 'LIGHT_GAME', 'DECIDE_ON_SITE'] as const;
export type JoinGameStyle = (typeof JOIN_GAME_STYLES)[number];

export const JOIN_GAME_MEMO_MAX_LENGTH = 500;

export const GAME_MEMO_PRESETS = [
  '가볍게 재미 위주로 하고, 방식은 현장에서 협의해요.',
  '타당 소액 정도로 생각하고 있고, 참가자들과 협의 가능합니다.',
  '진 팀이 식사비를 조금 부담하는 정도로 재미있게 해요.',
  '게임은 가볍게 하고, 금액이나 방식은 참가자끼리 정해요.',
  '내기는 부담 없을 정도로만 하고 현장에서 같이 결정해요.',
] as const;

export const GAME_MEMO_CUSTOM_PRESET_LABEL = '직접 입력';

export type JoinGameStyleInput = {
  gameStyle?: JoinGameStyle | null;
  gameMemo?: string | null;
};

export function normalizeJoinGameStyle(input: JoinGameStyleInput): {
  gameStyle: JoinGameStyle;
  gameMemo: string | null;
} {
  const gameStyle = input.gameStyle ?? 'FRIENDLY';
  const trimmed = input.gameMemo?.trim() ?? '';
  if (gameStyle !== 'LIGHT_GAME') {
    return { gameStyle, gameMemo: null };
  }
  return { gameStyle, gameMemo: trimmed.length > 0 ? trimmed : null };
}

export function validateJoinGameStyle(
  input: JoinGameStyleInput,
): { ok: true } | { ok: false; code: string } {
  const style = input.gameStyle ?? 'FRIENDLY';
  if (!JOIN_GAME_STYLES.includes(style)) return { ok: false, code: 'invalid_game_style' };
  const memo = input.gameMemo?.trim() ?? '';
  if (memo.length > JOIN_GAME_MEMO_MAX_LENGTH) {
    return { ok: false, code: 'game_memo_too_long' };
  }
  return { ok: true };
}

export function formatJoinGameStyleLabel(style: JoinGameStyle | null | undefined): string {
  switch (style ?? 'FRIENDLY') {
    case 'LIGHT_GAME':
      return '가벼운 게임 있음';
    case 'DECIDE_ON_SITE':
      return '현장에서 결정';
    default:
      return '친선 위주';
  }
}

export function formatJoinGameStyleCardLabel(style: JoinGameStyle | null | undefined): string | null {
  if (style === 'LIGHT_GAME') return '🎯 가벼운 게임';
  return null;
}

export function hasJoinGameInfo(
  gameStyle: JoinGameStyle | null | undefined,
  gameMemo: string | null | undefined,
): boolean {
  return (gameStyle ?? 'FRIENDLY') !== 'FRIENDLY' || Boolean(gameMemo?.trim());
}
