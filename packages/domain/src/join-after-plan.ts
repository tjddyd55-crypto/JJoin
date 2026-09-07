export const JOIN_AFTER_PLANS = ['NONE', 'MEAL_OR_DRINK', 'DECIDE_ON_SITE'] as const;
export type JoinAfterPlan = (typeof JOIN_AFTER_PLANS)[number];

export const JOIN_AFTER_MEMO_MAX_LENGTH = 500;

export const AFTER_MEMO_PRESETS = [
  '게임 끝나고 근처에서 같이 저녁 먹어요.',
  '게임 후 가볍게 한잔할 예정이에요.',
  '식사 후 여유되면 한잔까지 생각하고 있어요.',
  '참가자들과 상의해서 식사나 한잔 같이 해요.',
  '게임만 참여해도 괜찮고, 애프터는 자유예요.',
  '애프터까지 함께하실 분이면 좋아요.',
] as const;

export const AFTER_MEMO_CUSTOM_PRESET_LABEL = '직접 입력';

export type JoinAfterPlanInput = {
  afterPlan?: JoinAfterPlan | null;
  afterMemo?: string | null;
};

export function normalizeJoinAfterPlan(input: JoinAfterPlanInput): {
  afterPlan: JoinAfterPlan;
  afterMemo: string | null;
} {
  const afterPlan = input.afterPlan ?? 'NONE';
  const trimmed = input.afterMemo?.trim() ?? '';
  if (afterPlan !== 'MEAL_OR_DRINK') {
    return { afterPlan, afterMemo: null };
  }
  return { afterPlan, afterMemo: trimmed.length > 0 ? trimmed : null };
}

export function validateJoinAfterPlan(
  input: JoinAfterPlanInput,
): { ok: true } | { ok: false; code: string } {
  const plan = input.afterPlan ?? 'NONE';
  if (!JOIN_AFTER_PLANS.includes(plan)) return { ok: false, code: 'invalid_after_plan' };
  const memo = input.afterMemo?.trim() ?? '';
  if (memo.length > JOIN_AFTER_MEMO_MAX_LENGTH) {
    return { ok: false, code: 'after_memo_too_long' };
  }
  return { ok: true };
}

export function formatJoinAfterPlanLabel(plan: JoinAfterPlan | null | undefined): string {
  switch (plan ?? 'NONE') {
    case 'MEAL_OR_DRINK':
      return '식사/한잔 예정';
    case 'DECIDE_ON_SITE':
      return '현장에서 결정';
    default:
      return '없음';
  }
}

export function formatJoinAfterPlanCardLabel(plan: JoinAfterPlan | null | undefined): string | null {
  if (plan === 'MEAL_OR_DRINK') return '🍽 식사/한잔';
  return null;
}

export function hasJoinAfterInfo(
  afterPlan: JoinAfterPlan | null | undefined,
  afterMemo: string | null | undefined,
): boolean {
  return (afterPlan ?? 'NONE') !== 'NONE' || Boolean(afterMemo?.trim());
}
