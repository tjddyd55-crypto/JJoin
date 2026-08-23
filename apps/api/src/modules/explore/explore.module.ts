import { Module } from '@nestjs/common';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { JoinsModule } from '../joins/joins.module';
import { PresenceModule } from '../presence/presence.module';
import { VenuesModule } from '../venues/venues.module';
import { VENUE_SEARCH_PROVIDER } from '../../providers/venue-search.types';
import { resolveVenueProviderMode } from '../../providers/venue-search.config';
import { MockVenueSearchAdapter } from '../../providers/mock-venue-search.adapter';
import { KakaoLocalVenueSearchAdapter } from '../../providers/kakao-local-venue-search.adapter';
import { venueSearchConfig } from '../../providers/venue-search.config';

@Module({
  imports: [JoinsModule, PresenceModule, VenuesModule],
  controllers: [ExploreController],
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
    ExploreService,
  ],
  exports: [ExploreService],
})
export class ExploreModule {}
