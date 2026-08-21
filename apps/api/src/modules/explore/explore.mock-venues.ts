import type { ExploreVenueDto } from '@jjoin/types';
import { exploreConfig } from '../presence/presence.config';

/**
 * Geoje-area fixture venues (MOCK provider).
 * openJoinCount / joinPreviews are filled from PostgreSQL at Explore query time.
 */
export const MOCK_EXPLORE_VENUES: ExploreVenueDto[] = [
  {
    venueId: 'venue_sg_geoje',
    name: 'SG골프 거제점',
    address: '거제시 고현동',
    regionLabel: '거제시 고현동',
    latitude: exploreConfig.demoCenter.latitude + 0.004,
    longitude: exploreConfig.demoCenter.longitude - 0.006,
    distanceMeters: null,
    openJoinCount: 0,
    joinPreviews: [],
  },
  {
    venueId: 'venue_golfzon_gohyeon',
    name: '골프존 고현점',
    address: '거제시 고현동',
    regionLabel: '거제시 고현동',
    latitude: exploreConfig.demoCenter.latitude + 0.002,
    longitude: exploreConfig.demoCenter.longitude + 0.003,
    distanceMeters: null,
    openJoinCount: 0,
    joinPreviews: [],
  },
  {
    venueId: 'venue_screenpark',
    name: '거제 스크린파크',
    address: '거제시 장평동',
    regionLabel: '거제시 장평동',
    latitude: exploreConfig.demoCenter.latitude - 0.003,
    longitude: exploreConfig.demoCenter.longitude - 0.002,
    distanceMeters: null,
    openJoinCount: 0,
    joinPreviews: [],
  },
  {
    venueId: 'venue_kakao_okpo',
    name: '카카오골프 옥포점',
    address: '거제시 옥포동',
    regionLabel: '거제시 옥포동',
    latitude: exploreConfig.demoCenter.latitude + 0.008,
    longitude: exploreConfig.demoCenter.longitude + 0.007,
    distanceMeters: null,
    openJoinCount: 0,
    joinPreviews: [],
  },
  {
    venueId: 'venue_paradise',
    name: '파라다이스 스크린',
    address: '거제시 아주동',
    regionLabel: '거제시 아주동',
    latitude: exploreConfig.demoCenter.latitude - 0.006,
    longitude: exploreConfig.demoCenter.longitude + 0.005,
    distanceMeters: null,
    openJoinCount: 0,
    joinPreviews: [],
  },
  {
    venueId: 'venue_sky',
    name: '스카이스크린 거제',
    address: '거제시 수월동',
    regionLabel: '거제시 수월동',
    latitude: exploreConfig.demoCenter.latitude + 0.001,
    longitude: exploreConfig.demoCenter.longitude - 0.009,
    distanceMeters: null,
    openJoinCount: 0,
    joinPreviews: [],
  },
];
