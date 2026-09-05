import { Controller, Get, Param } from '@nestjs/common';
import { PlayerReviewService } from './player-review.service';
import { ParticipationTrustService } from './participation-trust.service';

/** Public reputation/review reads — kept in JoinLoop to avoid Users↔JoinLoop circular imports. */
@Controller('users')
export class UserReputationController {
  constructor(
    private readonly reviews: PlayerReviewService,
    private readonly participationTrust: ParticipationTrustService,
  ) {}

  @Get(':id/reputation')
  reputation(@Param('id') id: string) {
    return this.reviews.getReputation(id);
  }

  @Get(':id/participation-trust')
  participationTrustMetrics(@Param('id') id: string) {
    return this.participationTrust.getTrust(id);
  }

  @Get(':id/reviews')
  listReviews(@Param('id') id: string) {
    return this.reviews.listPublicReviews(id);
  }
}
