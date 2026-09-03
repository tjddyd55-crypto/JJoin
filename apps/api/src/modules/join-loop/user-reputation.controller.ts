import { Controller, Get, Param } from '@nestjs/common';
import { PlayerReviewService } from './player-review.service';

/** Public reputation/review reads — kept in JoinLoop to avoid Users↔JoinLoop circular imports. */
@Controller('users')
export class UserReputationController {
  constructor(private readonly reviews: PlayerReviewService) {}

  @Get(':id/reputation')
  reputation(@Param('id') id: string) {
    return this.reviews.getReputation(id);
  }

  @Get(':id/reviews')
  listReviews(@Param('id') id: string) {
    return this.reviews.listPublicReviews(id);
  }
}
