import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ClubActivityType, ClubJoinMode, ClubMembershipStatus, ClubVisibility } from '@jjoin/types';
import {
  filterClubsByQuery,
  filterDiscoverClubs,
  formatClubCardMetaLine,
  partitionDiscoverSections,
} from './club-display';

const sampleClub = {
  id: 'club-1',
  name: '일산 스크린 모임',
  coverImageUrl: null,
  intro: '주말 라운드',
  region: '일산',
  activityRegions: [
    {
      sido: '경기',
      sigungu: '고양',
      parentSigungu: null,
      displayName: '일산',
      shortLabel: '일산',
    },
  ],
  activityType: ClubActivityType.SCREEN,
  primaryVenueName: null,
  joinMode: ClubJoinMode.APPROVAL,
  visibility: ClubVisibility.PUBLIC,
  primaryAgeGroup: null,
  memberCount: 12,
  myRole: null,
  myStatus: null,
  eventsThisYear: 3,
  totalAttended: 10,
  averageAttendanceRate: 0.8,
  recent30DayEvents: 2,
  recent30DayAttendanceRate: 0.75,
};

test('formatClubCardMetaLine composes activity region and member count', () => {
  const line = formatClubCardMetaLine(sampleClub);
  assert.match(line, /스크린/);
  assert.match(line, /일산/);
  assert.match(line, /회원 12/);
});

test('filterClubsByQuery matches name and region', () => {
  const items = filterClubsByQuery([sampleClub], '일산');
  assert.equal(items.length, 1);
  assert.equal(filterClubsByQuery([sampleClub], '없는키워드').length, 0);
});

test('filterDiscoverClubs supports active and mine filters', () => {
  const activeClub = { ...sampleClub, id: 'a', recent30DayEvents: 1, myStatus: null };
  const mineClub = { ...sampleClub, id: 'b', myStatus: ClubMembershipStatus.ACTIVE, recent30DayEvents: 0 };
  const all = [activeClub, mineClub];
  assert.equal(filterDiscoverClubs(all, 'active').length, 1);
  assert.equal(filterDiscoverClubs(all, 'mine').length, 1);
});

test('partitionDiscoverSections avoids duplicate clubs', () => {
  const clubs = [
    { ...sampleClub, id: '1', recent30DayEvents: 2 },
    { ...sampleClub, id: '2', recent30DayEvents: 0 },
  ];
  const { active, recommended } = partitionDiscoverSections(clubs);
  assert.equal(active.length, 1);
  assert.equal(recommended.length, 1);
  assert.notEqual(active[0].id, recommended[0].id);
});
