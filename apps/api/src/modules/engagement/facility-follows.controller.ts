import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { FacilityFollowsService } from './facility-follows.service';

@Controller()
@UseGuards(MockAuthGuard)
export class FacilityFollowsController {
  constructor(private readonly service: FacilityFollowsService) {}

  @Get('me/facility-follows')
  list(@CurrentUserId() userId: string) {
    return this.service.list(userId);
  }

  @Post('golf-facilities/:id/follow')
  follow(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.follow(userId, id);
  }

  @Delete('golf-facilities/:id/follow')
  unfollow(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.unfollow(userId, id);
  }
}
