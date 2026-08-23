import { Module } from '@nestjs/common';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { VENUE_SEARCH_PROVIDER } from '../../providers/venue-search.types';
import { resolveVenueProviderMode } from '../../providers/venue-search.config';
import { MockVenueSearchAdapter } from '../../providers/mock-venue-search.adapter';
import { KakaoLocalVenueSearchAdapter } from '../../providers/kakao-local-venue-search.adapter';
import { venueSearchConfig } from '../../providers/venue-search.config';

@Module({
  controllers: [VenuesController],
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
  ],
  exports: [VenuesService, VENUE_SEARCH_PROVIDER],
})
export class VenuesModule {}
