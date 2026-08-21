import type { ExploreMapResponse } from '@jjoin/types';

/** Offline fallback — joinPreviews empty; live data comes from API+DB merge. */
export function getMockExploreMap(): ExploreMapResponse {
  return {
    venues: [
      {
        venueId: 'venue_sg_geoje',
        name: 'SG골프 거제점',
        address: '거제시 고현동',
        regionLabel: '거제시 고현동',
        latitude: 34.8805,
        longitude: 128.6211,
        distanceMeters: 420,
        openJoinCount: 0,
        joinPreviews: [],
      },
      {
        venueId: 'venue_golfzon_gohyeon',
        name: '골프존 고현점',
        address: '거제시 고현동',
        regionLabel: '거제시 고현동',
        latitude: 34.8785,
        longitude: 128.6301,
        distanceMeters: 680,
        openJoinCount: 0,
        joinPreviews: [],
      },
    ],
    users: [],
    metadata: {
      sportCode: 'SCREEN_GOLF',
      filter: 'ALL',
      source: 'mock',
      venueCount: 2,
      userCount: 0,
    },
  };
}
