import type {
  ExploreFilter,
  ExploreMapResponse,
  ExploreVenueDto,
  PublicNearbyUserDto,
} from '@jjoin/types';
import { GEOJE_DEMO_REGION } from '../model/map-types';

/** Offline / missing-API shell fixtures — labeled mock, never claimed as live Venue Provider. */
export function getMockExploreMap(filter: ExploreFilter = 'ALL'): ExploreMapResponse {
  const venues: ExploreVenueDto[] = [
    {
      venueId: 'venue_sg_geoje',
      name: 'SG골프 거제점',
      address: '거제시 고현동',
      regionLabel: '거제시 고현동',
      latitude: GEOJE_DEMO_REGION.latitude + 0.004,
      longitude: GEOJE_DEMO_REGION.longitude - 0.006,
      distanceMeters: 1200,
      openJoinCount: 2,
      joinPreviews: [
        {
          joinId: 'join_sg_1300',
          startAt: '오늘 13:00',
          scheduledEndAt: '17:00',
          currentParticipants: 1,
          maxParticipants: 4,
          rewardCoin: '20',
          hostNickname: '김진우',
          hostVerified: true,
        },
        {
          joinId: 'join_sg_1700',
          startAt: '오늘 17:00',
          scheduledEndAt: '21:00',
          currentParticipants: 2,
          maxParticipants: 4,
          rewardCoin: '10',
          hostNickname: '버디킴',
          hostVerified: true,
        },
      ],
    },
    {
      venueId: 'venue_golfzon_gohyeon',
      name: '골프존 고현점',
      address: '거제시 고현동',
      regionLabel: '거제시 고현동',
      latitude: GEOJE_DEMO_REGION.latitude + 0.002,
      longitude: GEOJE_DEMO_REGION.longitude + 0.003,
      distanceMeters: 800,
      openJoinCount: 1,
      joinPreviews: [
        {
          joinId: 'join_gz_1500',
          startAt: '오늘 15:00',
          scheduledEndAt: '19:00',
          currentParticipants: 2,
          maxParticipants: 4,
          rewardCoin: '10',
          hostNickname: '골프왕77',
          hostVerified: true,
        },
      ],
    },
    {
      venueId: 'venue_screenpark',
      name: '거제 스크린파크',
      address: '거제시 장평동',
      regionLabel: '거제시 장평동',
      latitude: GEOJE_DEMO_REGION.latitude - 0.003,
      longitude: GEOJE_DEMO_REGION.longitude - 0.002,
      distanceMeters: 1500,
      openJoinCount: 0,
      joinPreviews: [],
    },
    {
      venueId: 'venue_kakao_okpo',
      name: '카카오골프 옥포점',
      address: '거제시 옥포동',
      regionLabel: '거제시 옥포동',
      latitude: GEOJE_DEMO_REGION.latitude + 0.008,
      longitude: GEOJE_DEMO_REGION.longitude + 0.007,
      distanceMeters: 2100,
      openJoinCount: 2,
      joinPreviews: [],
    },
    {
      venueId: 'venue_sg_jangseung',
      name: 'SG골프 장승포점',
      address: '거제시 장승포동',
      regionLabel: '거제시 장승포동',
      latitude: GEOJE_DEMO_REGION.latitude - 0.007,
      longitude: GEOJE_DEMO_REGION.longitude + 0.01,
      distanceMeters: 2800,
      openJoinCount: 1,
      joinPreviews: [],
    },
    {
      venueId: 'venue_park_aje',
      name: '에이원 스크린 아주점',
      address: '거제시 아주동',
      regionLabel: '거제시 아주동',
      latitude: GEOJE_DEMO_REGION.latitude + 0.001,
      longitude: GEOJE_DEMO_REGION.longitude - 0.01,
      distanceMeters: 900,
      openJoinCount: 0,
      joinPreviews: [],
    },
  ];

  const users: PublicNearbyUserDto[] = [
    {
      userId: 'mock_user_golfking',
      nickname: '골프왕77',
      avatarUrl: null,
      verifiedBadge: true,
      ageBand: null,
      genderDisplay: null,
      skillLevel: null,
      approxDistanceMeters: 1200,
      displayLat: GEOJE_DEMO_REGION.latitude + 0.003,
      displayLng: GEOJE_DEMO_REGION.longitude + 0.002,
      regionLabel: '고현동 주변',
      availableUntil: new Date(Date.now() + 7200_000).toISOString(),
    },
    {
      userId: 'mock_user_buddy',
      nickname: '버디킴',
      avatarUrl: null,
      verifiedBadge: true,
      ageBand: null,
      genderDisplay: null,
      skillLevel: null,
      approxDistanceMeters: 800,
      displayLat: GEOJE_DEMO_REGION.latitude - 0.002,
      displayLng: GEOJE_DEMO_REGION.longitude + 0.004,
      regionLabel: '고현동 주변',
      availableUntil: new Date(Date.now() + 3600_000).toISOString(),
    },
    {
      userId: 'mock_user_jinwoo',
      nickname: '김진우',
      avatarUrl: null,
      verifiedBadge: false,
      ageBand: null,
      genderDisplay: null,
      skillLevel: null,
      approxDistanceMeters: 1500,
      displayLat: GEOJE_DEMO_REGION.latitude + 0.005,
      displayLng: GEOJE_DEMO_REGION.longitude - 0.003,
      regionLabel: '장평동 주변',
      availableUntil: new Date(Date.now() + 10800_000).toISOString(),
    },
  ];

  let v = venues;
  let u = users;
  if (filter === 'VENUE') u = [];
  if (filter === 'USER') v = [];
  if (filter === 'TODAY_JOIN') {
    v = venues.filter((x) => x.openJoinCount > 0);
    u = [];
  }

  return {
    venues: v,
    users: u,
    metadata: {
      sportCode: 'SCREEN_GOLF',
      filter,
      source: 'mock',
      venueCount: v.length,
      userCount: u.length,
    },
  };
}
