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
import { JoinsService } from '../joins/joins.service';

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
  constructor(private readonly joins: JoinsService) {}

  async getMap(query: ExploreMapQuery): Promise<ExploreMapResponse> {
    const sportCode = query.sportCode ?? exploreConfig.defaultSportCode;
    const filter = query.filter ?? 'ALL';
    const centerLat = query.centerLat ?? exploreConfig.demoCenter.latitude;
    const centerLng = query.centerLng ?? exploreConfig.demoCenter.longitude;

    const placeIds = MOCK_EXPLORE_VENUES.map((v) => v.venueId);
    const dbJoins = await this.joins.openJoinsByProviderPlaceIds(placeIds);

    let venues = MOCK_EXPLORE_VENUES.map((v) => {
      const previews = dbJoins.get(v.venueId) ?? [];
      return {
        ...v,
        distanceMeters: Math.round(
          haversineMeters(centerLat, centerLng, v.latitude, v.longitude),
        ),
        joinPreviews: previews,
        openJoinCount: previews.length,
      };
    });

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
        source: 'live',
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

    const fromPresence = memoryPresenceStore
      .listAvailable()
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
        return {
          userId: p.userId,
          nickname: me?.publicProfile?.nickname ?? '조인러',
          avatarUrl: me?.publicProfile?.avatarUrl ?? null,
          verifiedBadge: me?.publicProfile?.verifiedBadge ?? false,
          ageBand: (me?.publicProfile?.ageBand as AgeBand | null) ?? null,
          genderDisplay: me?.publicProfile?.genderDisplay ?? null,
          skillLevel:
            (me?.publicProfile?.sportProfiles[0]?.skillLevel as SportSkillLevel | null) ??
            null,
          approxDistanceMeters: Math.round(distance),
          displayLat: display.displayLat,
          displayLng: display.displayLng,
          regionLabel: me?.publicProfile?.regionLabel ?? null,
          availableUntil: (p.availableUntil ?? new Date()).toISOString(),
        } satisfies PublicNearbyUserDto;
      })
      .filter((u): u is PublicNearbyUserDto => u != null);

    return fromPresence;
  }
}
