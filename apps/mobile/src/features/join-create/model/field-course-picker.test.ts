import assert from 'node:assert/strict';
import test from 'node:test';
import { isFieldDongFilterToken, listFieldSigunguChoices } from '@jjoin/domain';
import {
  FIELD_COURSE_EMPTY_TRIGGER,
  FIELD_COURSE_PICKER_NATIONWIDE_LABEL,
  closeFieldCoursePicker,
  createFieldCoursePickerState,
  fieldCoursePickerSearchQuery,
  fieldCoursePickerTitle,
  fieldCoursePickerUsesDongFilter,
  goBackFieldCoursePicker,
  openFieldCoursePicker,
  selectFieldCoursePickerSido,
  selectFieldCoursePickerSigungu,
  setFieldCoursePickerSearch,
  startNationwideFieldCourseSearch,
} from './field-course-picker';

test('FIELD course picker opens full-screen at sido and does not use 구/동 filters', () => {
  const opened = openFieldCoursePicker();
  assert.equal(opened.open, true);
  assert.equal(opened.step, 'sido');
  assert.equal(fieldCoursePickerTitle(opened), '시/도 선택');
  assert.equal(FIELD_COURSE_EMPTY_TRIGGER, '골프장을 선택해주세요');
  assert.equal(FIELD_COURSE_PICKER_NATIONWIDE_LABEL.includes('이름'), true);

  const seoul = selectFieldCoursePickerSido(opened, '서울특별시');
  assert.equal(seoul.step, 'courses');
  assert.equal(seoul.sido, '서울특별시');
  assert.equal(seoul.sigungu, null);
  assert.equal(fieldCoursePickerUsesDongFilter(seoul), false);
  assert.equal(
    listFieldSigunguChoices(seoul.sido).some((city) => isFieldDongFilterToken(city.cityCounty)),
    false,
  );

  const gyeonggi = selectFieldCoursePickerSido(opened, '경기도');
  assert.equal(gyeonggi.step, 'sigungu');
  const yongin = selectFieldCoursePickerSigungu(gyeonggi, '용인시');
  assert.equal(yongin.step, 'courses');
  assert.deepEqual(fieldCoursePickerSearchQuery(yongin), {
    name: undefined,
    sido: '경기도',
    sigungu: '용인시',
  });
  assert.equal(isFieldDongFilterToken(yongin.sigungu), false);
});

test('picker back keeps navigation stack and does not invent dong steps', () => {
  const gyeonggi = selectFieldCoursePickerSido(openFieldCoursePicker(), '경기도');
  const yongin = selectFieldCoursePickerSigungu(gyeonggi, '용인시');
  const backToSigungu = goBackFieldCoursePicker(yongin);
  assert.equal(backToSigungu.step, 'sigungu');
  assert.equal(backToSigungu.sido, '경기도');
  assert.equal(backToSigungu.sigungu, null);

  const backToSido = goBackFieldCoursePicker(backToSigungu);
  assert.equal(backToSido.step, 'sido');
  assert.equal(backToSido.open, true);

  const closed = goBackFieldCoursePicker(backToSido);
  assert.equal(closed.open, false);

  const seoulCourses = selectFieldCoursePickerSido(openFieldCoursePicker(), '서울특별시');
  const seoulBack = goBackFieldCoursePicker(seoulCourses);
  assert.equal(seoulBack.step, 'sido');
  assert.equal(seoulBack.sido, null);
});

test('search stays inside the selected region, or nationwide when no region', () => {
  const named = setFieldCoursePickerSearch(
    selectFieldCoursePickerSigungu(
      selectFieldCoursePickerSido(openFieldCoursePicker(), '경기도'),
      '용인시',
    ),
    '레이크사이드',
  );
  assert.deepEqual(fieldCoursePickerSearchQuery(named), {
    name: '레이크사이드',
    sido: '경기도',
    sigungu: '용인시',
  });

  const nationwide = setFieldCoursePickerSearch(
    startNationwideFieldCourseSearch(openFieldCoursePicker()),
    '레이크사이드',
  );
  assert.equal(nationwide.step, 'courses');
  assert.deepEqual(fieldCoursePickerSearchQuery(nationwide), {
    name: '레이크사이드',
    sido: undefined,
    sigungu: undefined,
  });
});

test('selecting a course only replaces venue; other create draft fields stay put', () => {
  const draft = {
    gameDate: '2026-09-20',
    startTime: '07:30',
    greenFeePerPerson: 90000,
    recruitCount: 3,
    description: '초청 메모',
  };
  const picker = selectFieldCoursePickerSigungu(
    selectFieldCoursePickerSido(openFieldCoursePicker(), '경기도'),
    '용인시',
  );
  const afterSelect = closeFieldCoursePicker(picker);
  assert.equal(afterSelect.open, false);
  assert.deepEqual(draft, {
    gameDate: '2026-09-20',
    startTime: '07:30',
    greenFeePerPerson: 90000,
    recruitCount: 3,
    description: '초청 메모',
  });
  assert.deepEqual(createFieldCoursePickerState().open, false);
});
