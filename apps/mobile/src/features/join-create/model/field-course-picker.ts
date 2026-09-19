/**
 * FIELD create course picker — full-screen sido → (시/군) → course.
 * SCREEN RegionPickerSheet is intentionally not reused.
 */

import {
  FIELD_REGION_CATALOG,
  isFieldDongFilterToken,
  nextFieldCoursePickerStepAfterSido,
  shouldSkipFieldSigunguStep,
  type FieldProvinceGroup,
} from '@jjoin/domain';

export type FieldCoursePickerStep = 'sido' | 'sigungu' | 'courses';

export type FieldCoursePickerState = {
  open: boolean;
  step: FieldCoursePickerStep;
  sido: string | null;
  sigungu: string | null;
  searchName: string;
};

export type FieldCourseSearchQuery = {
  name?: string;
  sido?: string;
  sigungu?: string;
};

export function createFieldCoursePickerState(): FieldCoursePickerState {
  return {
    open: false,
    step: 'sido',
    sido: null,
    sigungu: null,
    searchName: '',
  };
}

export function openFieldCoursePicker(): FieldCoursePickerState {
  return {
    open: true,
    step: 'sido',
    sido: null,
    sigungu: null,
    searchName: '',
  };
}

export function closeFieldCoursePicker(
  state: FieldCoursePickerState,
): FieldCoursePickerState {
  return { ...state, open: false };
}

export function selectFieldCoursePickerSido(
  state: FieldCoursePickerState,
  sido: string,
): FieldCoursePickerState {
  return {
    ...state,
    sido,
    sigungu: null,
    searchName: '',
    step: nextFieldCoursePickerStepAfterSido(sido),
  };
}

export function selectFieldCoursePickerSigungu(
  state: FieldCoursePickerState,
  sigungu: string,
): FieldCoursePickerState {
  return {
    ...state,
    sigungu,
    searchName: '',
    step: 'courses',
  };
}

export function startNationwideFieldCourseSearch(
  state: FieldCoursePickerState,
): FieldCoursePickerState {
  return {
    ...state,
    step: 'courses',
    sido: null,
    sigungu: null,
    searchName: state.searchName,
  };
}

export function setFieldCoursePickerSearch(
  state: FieldCoursePickerState,
  searchName: string,
): FieldCoursePickerState {
  return { ...state, searchName };
}

export function goBackFieldCoursePicker(
  state: FieldCoursePickerState,
): FieldCoursePickerState {
  if (state.step === 'courses') {
    if (state.sido && !shouldSkipFieldSigunguStep(state.sido)) {
      return { ...state, step: 'sigungu', sigungu: null, searchName: '' };
    }
    return { ...state, step: 'sido', sido: null, sigungu: null, searchName: '' };
  }
  if (state.step === 'sigungu') {
    return { ...state, step: 'sido', sido: null, sigungu: null };
  }
  return { ...state, open: false };
}

export function fieldCoursePickerSearchQuery(
  state: FieldCoursePickerState,
): FieldCourseSearchQuery {
  const name = state.searchName.trim() || undefined;
  return {
    name,
    sido: state.sido ?? undefined,
    sigungu: state.sigungu ?? undefined,
  };
}

export function fieldCoursePickerUsesDongFilter(state: FieldCoursePickerState): boolean {
  return isFieldDongFilterToken(state.sido) || isFieldDongFilterToken(state.sigungu);
}

export function fieldCoursePickerTitle(state: FieldCoursePickerState): string {
  if (state.step === 'sido') return '시/도 선택';
  if (state.step === 'sigungu') return '시/군 선택';
  return '골프장 선택';
}

export function listFieldCoursePickerSidos(): readonly FieldProvinceGroup[] {
  return FIELD_REGION_CATALOG;
}

export function fieldCoursePickerEmptyHint(state: FieldCoursePickerState): string {
  if (state.searchName.trim()) {
    return '조건에 맞는 골프장이 없습니다. 이름이나 지역을 바꿔 보세요.';
  }
  if (state.sido) {
    return '이 지역에 등록된 골프장이 없습니다.';
  }
  return '시/도를 고르거나 골프장 이름으로 찾아 보세요.';
}

export const FIELD_COURSE_PICKER_NATIONWIDE_LABEL = '전국에서 이름으로 찾기';
export const FIELD_COURSE_EMPTY_TRIGGER = '골프장을 선택해주세요';
export const FIELD_COURSE_CHANGE_LABEL = '변경';
