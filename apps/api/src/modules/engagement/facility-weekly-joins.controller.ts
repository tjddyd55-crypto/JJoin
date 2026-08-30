import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { FacilityWeeklyJoinsService } from './facility-weekly-joins.service';

@Controller('golf-facilities')
@UseGuards(MockAuthGuard)
export class FacilityWeeklyJoinsController {
  constructor(private readonly service: FacilityWeeklyJoinsService) {}

  @Get(':id/weekly-joins')
  weeklyJoins(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    return this.service.weeklyJoins(id, userId, date);
  }
}
