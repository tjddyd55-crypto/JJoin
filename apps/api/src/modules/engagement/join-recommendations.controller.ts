import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { JoinRecommendationsService } from './join-recommendations.service';

function parseOptionalNumber(raw?: string): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

@Controller('me')
@UseGuards(MockAuthGuard)
export class JoinRecommendationsController {
  constructor(private readonly service: JoinRecommendationsService) {}

  @Get('recommended-joins')
  list(
    @CurrentUserId() userId: string,
    @Query('limit') limitRaw?: string,
    @Query('debug') debug?: string,
    @Query('lat') latRaw?: string,
    @Query('lng') lngRaw?: string,
  ) {
    const limit = limitRaw ? Number(limitRaw) : 5;
    return this.service.listForUser(userId, {
      limit: Number.isFinite(limit) ? limit : 5,
      includeDebug: debug === '1',
      lat: parseOptionalNumber(latRaw),
      lng: parseOptionalNumber(lngRaw),
    });
  }
}
