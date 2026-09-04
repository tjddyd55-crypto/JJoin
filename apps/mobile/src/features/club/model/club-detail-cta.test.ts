import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ClubActivityType,
  ClubJoinMode,
  ClubMembershipRole,
  ClubMembershipStatus,
  ClubVisibility,
  type ClubDetailDto,
} from '@jjoin/types';
import {
  resolveClubDetailPrimaryCta,
  shouldShowClubDetailStickyCta,
} from './club-detail-cta';

const baseDetail: ClubDetailDto = {
  id: 'club-1',
  name: '테스트 동호회',
  coverImageUrl: null,
  intro: '소개',
  region: '일산',
  activityRegions: [],
  activityType: ClubActivityType.SCREEN,
  primaryVenueName: null,
  joinMode: ClubJoinMode.APPROVAL,
  visibility: ClubVisibility.PUBLIC,
  primaryAgeGroup: null,
  memberCount: 10,
  myRole: null,
  myStatus: null,
  dashboard: {
    memberCount: 10,
    eventsThisYear: 1,
    totalAttended: 1,
    averageAttendanceRate: 1,
    recent30DayEvents: 1,
    recent30DayAttendanceRate: 1,
  },
  activeEvents: [],
};

test('resolveClubDetailPrimaryCta shows apply for guests', () => {
  const cta = resolveClubDetailPrimaryCta({ detail: baseDetail, isStaff: false });
  assert.equal(cta.label, '가입 신청');
  assert.equal(cta.presentation, 'apply');
});

test('resolveClubDetailPrimaryCta shows instant join label', () => {
  const cta = resolveClubDetailPrimaryCta({
    detail: { ...baseDetail, joinMode: ClubJoinMode.INSTANT },
    isStaff: false,
  });
  assert.equal(cta.label, '동호회 가입');
});

test('resolveClubDetailPrimaryCta hides sticky for active members', () => {
  const cta = resolveClubDetailPrimaryCta({
    detail: { ...baseDetail, myStatus: ClubMembershipStatus.ACTIVE },
    isStaff: false,
  });
  assert.equal(shouldShowClubDetailStickyCta(cta.presentation), false);
});

test('resolveClubDetailPrimaryCta shows manage for staff', () => {
  const cta = resolveClubDetailPrimaryCta({
    detail: {
      ...baseDetail,
      myRole: ClubMembershipRole.OWNER,
      myStatus: ClubMembershipStatus.ACTIVE,
    },
    isStaff: true,
  });
  assert.equal(cta.label, '동호회 관리');
  assert.equal(shouldShowClubDetailStickyCta(cta.presentation), true);
});
