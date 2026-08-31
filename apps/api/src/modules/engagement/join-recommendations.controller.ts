import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { JoinRecommendationsService } from './join-recommendations.service';

@Controller('me')
@UseGuards(MockAuthGuard)
export class JoinRecommendationsController {
  constructor(private readonly service: JoinRecommendationsService) {}

  @Get('recommended-joins')
  list(
    @CurrentUserId() userId: string,
    @Query('limit') limitRaw?: string,
    @Query('debug') debug?: string,
  ) {
    const limit = limitRaw ? Number(limitRaw) : 5;
    return this.service.listForUser(userId, {
      limit: Number.isFinite(limit) ? limit : 5,
      includeDebug: debug === '1',
    });
  }
}
