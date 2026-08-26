import { Module } from '@nestjs/common';
import { VenuesController } from './venues.controller';
import { MeVenuesController } from './me-venues.controller';
import { MeJoinRegionsController } from './me-join-regions.controller';
import { VenuesService } from './venues.service';
import { MeVenuesService } from './me-venues.service';
import { MeJoinRegionsService } from './me-join-regions.service';
import { VENUE_SEARCH_PROVIDER } from '../../providers/venue-search.types';
import { resolveVenueProviderMode } from '../../providers/venue-search.config';
import { MockVenueSearchAdapter } from '../../providers/mock-venue-search.adapter';
import { KakaoLocalVenueSearchAdapter } from '../../providers/kakao-local-venue-search.adapter';
import { venueSearchConfig } from '../../providers/venue-search.config';

@Module({
  controllers: [VenuesController, MeVenuesController, MeJoinRegionsController],
  providers: [
    MockVenueSearchAdapter,
    KakaoLocalVenueSearchAdapter,
    {
      provide: VENUE_SEARCH_PROVIDER,
      inject: [MockVenueSearchAdapter, KakaoLocalVenueSearchAdapter],
      useFactory: (
        mock: MockVenueSearchAdapter,
        kakao: KakaoLocalVenueSearchAdapter,
      ) => {
        const mode = resolveVenueProviderMode();
        if (mode === 'kakao') {
          if (!venueSearchConfig.restApiKey) {
            throw new Error(
              'VENUE_PROVIDER_MODE=kakao requires KAKAO_LOCAL_REST_API_KEY',
            );
          }
          return kakao;
        }
        return mock;
      },
    },
    VenuesService,
    MeVenuesService,
    MeJoinRegionsService,
  ],
  exports: [VenuesService, MeVenuesService, VENUE_SEARCH_PROVIDER],
})
export class VenuesModule {}
