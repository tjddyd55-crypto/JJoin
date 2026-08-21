import { Injectable } from '@nestjs/common';
import {
  AgeBand,
  ExploreFilter,
  SportSkillLevel,
  type ExploreMapResponse,
  type PublicNearbyUserDto,
} from '@jjoin/types';
import { mockUserStore } from '../../mock/mock-user.store';
import { memoryPresenceStore } from '../presence/memory-presence.store';
import { exploreConfig, presenceConfig } from '../presence/presence.config';
import { haversineMeters, toPrivacyDisplayPoint } from '../presence/privacy-location';
import { MOCK_EXPLORE_VENUES } from './explore.mock-venues';

export type ExploreMapQuery = {
  sportCode?: string;
  filter?: ExploreFilter;
  centerLat?: number;
  centerLng?: number;
  southWestLat?: number;
  southWestLng?: number;
  northEastLat?: number;
  northEastLng?: number;
  viewerUserId?: string;
};

@Injectable()
export class ExploreService {
  getMap(query: ExploreMapQuery): ExploreMapResponse {
    const sportCode = query.sportCode ?? exploreConfig.defaultSportCode;
    const filter = query.filter ?? 'ALL';
    const centerLat = query.centerLat ?? exploreConfig.demoCenter.latitude;
    const centerLng = query.centerLng ?? exploreConfig.demoCenter.longitude;

    let venues = MOCK_EXPLORE_VENUES.map((v) => ({
      ...v,
      distanceMeters: Math.round(
        haversineMeters(centerLat, centerLng, v.latitude, v.longitude),
      ),
      joinPreviews: [...v.joinPreviews],
    }));

    if (filter === 'TODAY_JOIN') {
      venues = venues.filter((v) => v.openJoinCount > 0);
    }
    if (filter === 'USER') {
      venues = [];
    }

    const users =
      filter === 'VENUE' || filter === 'TODAY_JOIN'
        ? []
        : this.nearbyUsers({
            centerLat,
            centerLng,
            viewerUserId: query.viewerUserId,
          });

    return {
      venues,
      users,
      metadata: {
        sportCode,
        filter,
        source: 'mock',
        venueCount: venues.length,
        userCount: users.length,
      },
    };
  }

  private nearbyUsers(input: {
    centerLat: number;
    centerLng: number;
    viewerUserId?: string;
  }): PublicNearbyUserDto[] {
    const now = Date.now();
    const freshnessMs = presenceConfig.freshnessMinutes * 60_000;
    const radius = presenceConfig.nearbyRadiusMeters;

    const fromPresence = memoryPresenceStore.listAvailable()
      .filter((p) => p.userId !== input.viewerUserId)
      .filter((p) => now - p.lastLocationAt.getTime() <= freshnessMs)
      .map((p) => {
        const distance = haversineMeters(
          input.centerLat,
          input.centerLng,
          p.latitude,
          p.longitude,
        );
        if (distance > radius) return null;
        const me = mockUserStore.getMe(p.userId);
        const display = toPrivacyDisplayPoint({
          userId: p.userId,
          latitude: p.latitude,
          longitude: p.longitude,
          jitterMinMeters: presenceConfig.privacyJitterMinMeters,
          jitterMaxMeters: presenceConfig.privacyJitterMaxMeters,
          gridDegrees: presenceConfig.privacyGridDegrees,
        });
        const dto: PublicNearbyUserDto = {
          userId: p.userId,
          nickname: me?.publicProfile?.nickname ?? 'JJOIN 회원',
          avatarUrl: me?.publicProfile?.avatarUrl ?? null,
          verifiedBadge: me?.publicProfile?.verifiedBadge ?? false,
          ageBand: me?.publicProfile?.ageBand ?? null,
          genderDisplay: me?.publicProfile?.genderDisplay ?? null,
          skillLevel: me?.publicProfile?.sportProfiles?.[0]?.skillLevel ?? null,
          approxDistanceMeters: Math.round(distance),
          displayLat: display.displayLat,
          displayLng: display.displayLng,
          regionLabel: me?.publicProfile?.regionLabel ?? '고현동 주변',
          availableUntil: p.availableUntil!.toISOString(),
        };
        // Hard deny-list: never attach actual coordinates
        assertNoExactLocation(dto);
        return dto;
      })
      .filter((u): u is PublicNearbyUserDto => u != null);

    if (fromPresence.length > 0) return fromPresence;
    return MOCK_NEARBY_USERS.map((u) => ({
      ...u,
      approxDistanceMeters: Math.round(
        haversineMeters(input.centerLat, input.centerLng, u.displayLat, u.displayLng),
      ),
    }));
  }
}

function assertNoExactLocation(dto: PublicNearbyUserDto) {
  const forbidden = ['actualLat', 'actualLng', 'latitude', 'longitude', 'lat', 'lng'];
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(dto, key) && key !== 'displayLat' && key !== 'displayLng') {
      throw new Error(`privacy_leak:${key}`);
    }
  }
}

/** Fixture users when no live AVAILABLE presence (map shell QA). */
const MOCK_NEARBY_USERS: PublicNearbyUserDto[] = [
  {
    userId: 'mock_user_golfking',
    nickname: '골프왕77',
    avatarUrl: null,
    verifiedBadge: true,
    ageBand: AgeBand.THIRTIES,
    genderDisplay: '남성',
    skillLevel: SportSkillLevel.INTERMEDIATE,
    approxDistanceMeters: 1200,
    displayLat: exploreConfig.demoCenter.latitude + 0.003,
    displayLng: exploreConfig.demoCenter.longitude + 0.002,
    regionLabel: '고현동 주변',
    availableUntil: new Date(Date.now() + 2 * 3600_000).toISOString(),
  },
  {
    userId: 'mock_user_buddy',
    nickname: '버디킴',
    avatarUrl: null,
    verifiedBadge: true,
    ageBand: AgeBand.TWENTIES,
    genderDisplay: '여성',
    skillLevel: SportSkillLevel.BEGINNER,
    approxDistanceMeters: 800,
    displayLat: exploreConfig.demoCenter.latitude - 0.002,
    displayLng: exploreConfig.demoCenter.longitude + 0.004,
    regionLabel: '고현동 주변',
    availableUntil: new Date(Date.now() + 3600_000).toISOString(),
  },
  {
    userId: 'mock_user_jinwoo',
    nickname: '김진우',
    avatarUrl: null,
    verifiedBadge: false,
    ageBand: AgeBand.THIRTIES,
    genderDisplay: '남성',
    skillLevel: SportSkillLevel.ADVANCED,
    approxDistanceMeters: 1500,
    displayLat: exploreConfig.demoCenter.latitude + 0.005,
    displayLng: exploreConfig.demoCenter.longitude - 0.003,
    regionLabel: '장평동 주변',
    availableUntil: new Date(Date.now() + 3 * 3600_000).toISOString(),
  },
];
