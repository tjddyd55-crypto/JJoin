import { JOIN_MEMBER_MAX_AGE, JOIN_MEMBER_MIN_AGE } from '@jjoin/domain';

export type FieldAgeConditionMode = 'ANY' | 'SPECIFY';

export const FIELD_DEFAULT_SPECIFIED_MIN_AGE = 35;
export const FIELD_DEFAULT_SPECIFIED_MAX_AGE = 49;

export type FieldAgeConditionState = {
  ageMode: FieldAgeConditionMode;
  minAge: number | null;
  maxAge: number | null;
  draftMinAge: number;
  draftMaxAge: number;
};

export function defaultFieldAgeCondition(): FieldAgeConditionState {
  return {
    ageMode: 'ANY',
    minAge: null,
    maxAge: null,
    draftMinAge: FIELD_DEFAULT_SPECIFIED_MIN_AGE,
    draftMaxAge: FIELD_DEFAULT_SPECIFIED_MAX_AGE,
  };
}

export function fieldAgeConditionPayload(
  state: Pick<FieldAgeConditionState, 'ageMode' | 'minAge' | 'maxAge' | 'draftMinAge' | 'draftMaxAge'>,
): { minAge: number | null; maxAge: number | null } {
  if (state.ageMode !== 'SPECIFY') {
    return { minAge: null, maxAge: null };
  }
  return {
    minAge: state.minAge ?? state.draftMinAge ?? FIELD_DEFAULT_SPECIFIED_MIN_AGE,
    maxAge: state.maxAge ?? state.draftMaxAge ?? FIELD_DEFAULT_SPECIFIED_MAX_AGE,
  };
}

export function applyFieldAgeMode(
  state: FieldAgeConditionState,
  mode: FieldAgeConditionMode,
): FieldAgeConditionState {
  if (mode === 'ANY') {
    return {
      ...state,
      ageMode: 'ANY',
      minAge: null,
      maxAge: null,
      draftMinAge: state.minAge ?? state.draftMinAge,
      draftMaxAge: state.maxAge ?? state.draftMaxAge,
    };
  }
  const minAge = state.draftMinAge ?? FIELD_DEFAULT_SPECIFIED_MIN_AGE;
  const maxAge = state.draftMaxAge ?? FIELD_DEFAULT_SPECIFIED_MAX_AGE;
  return {
    ...state,
    ageMode: 'SPECIFY',
    minAge,
    maxAge,
    draftMinAge: minAge,
    draftMaxAge: maxAge,
  };
}

export function applyFieldAgeRange(
  state: FieldAgeConditionState,
  next: { minAge: number | null; maxAge: number | null },
): FieldAgeConditionState {
  const minAge = next.minAge ?? JOIN_MEMBER_MIN_AGE;
  const maxAge = next.maxAge ?? JOIN_MEMBER_MAX_AGE;
  return {
    ...state,
    ageMode: 'SPECIFY',
    minAge,
    maxAge,
    draftMinAge: minAge,
    draftMaxAge: maxAge,
  };
}

export const FIELD_AGE_MODE_CHIPS: ReadonlyArray<{
  value: FieldAgeConditionMode;
  label: string;
}> = [
  { value: 'ANY', label: '나이 무관' },
  { value: 'SPECIFY', label: '나이 지정' },
];
