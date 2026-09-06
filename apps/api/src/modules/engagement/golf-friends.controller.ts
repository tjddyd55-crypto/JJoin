import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { GolfFriendsService } from './golf-friends.service';

@Controller('golf-friends')
@UseGuards(MockAuthGuard)
export class GolfFriendsController {
  constructor(private readonly service: GolfFriendsService) {}

  @Get('recommended')
  recommended(@CurrentUserId() userId: string) {
    return this.service.listRecommended(userId);
  }

  @Get('popular')
  popular(@CurrentUserId() userId: string) {
    return this.service.listPopular(userId);
  }

  @Get('nearby')
  nearby(
    @CurrentUserId() userId: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { items: [] };
    }
    return this.service.listNearby(userId, lat, lng);
  }

  @Get('search')
  search(@CurrentUserId() userId: string, @Query('q') q?: string) {
    return this.service.search(userId, q ?? '');
  }

  @Post(':userId/request')
  request(@CurrentUserId() userId: string, @Param('userId') targetUserId: string) {
    return this.service.requestFriend(userId, targetUserId);
  }
}
