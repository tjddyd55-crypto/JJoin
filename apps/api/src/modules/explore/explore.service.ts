import { Injectable } from '@nestjs/common';
import {
  ExploreFilter,
  type ExploreMapResponse,
} from '@jjoin/types';
import { exploreConfig } from '../presence/presence.config';
import { haversineMeters } from '../presence/privacy-location';
import { PresenceService } from '../presence/presence.service';
import { JoinsService } from '../joins/joins.service';
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
  constructor(
    private readonly joins: JoinsService,
    private readonly presence: PresenceService,
  ) {}

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
        : await this.presence.listNearbyPublic({
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
}
