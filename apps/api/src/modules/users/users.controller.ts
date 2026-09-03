import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CurrentUserId,
  MockAuthGuard,
  OptionalMockAuthGuard,
  OptionalUserId,
} from '../../common/mock-auth.guard';
import type { SportSkillLevel } from '@jjoin/types';

@Controller()
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('users/_meta')
  meta() {
    return this.service.ping();
  }

  @UseGuards(MockAuthGuard)
  @Get('me')
  me(@CurrentUserId() userId: string) {
    return this.service.getMe(userId);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/terms')
  terms(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.service.acceptTerms(userId, body);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/profile/setup')
  setup(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.service.setupProfile(userId, body);
  }

  @UseGuards(MockAuthGuard)
  @Patch('me/profile')
  edit(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.service.editProfile(userId, body);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/profile/avatar')
  avatar(
    @CurrentUserId() userId: string,
    @Body() body: { localUri?: string | null; skip?: boolean },
  ) {
    return this.service.setAvatar(userId, body);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/onboarding/location')
  location(@CurrentUserId() userId: string) {
    return this.service.completeLocationOnboarding(userId);
  }

  @UseGuards(MockAuthGuard)
  @Get('me/sport-profiles')
  sportProfiles(@CurrentUserId() userId: string) {
    return this.service.getSportProfiles(userId);
  }

  @UseGuards(MockAuthGuard)
  @Patch('me/sport-profiles/:sportCode')
  patchSport(
    @CurrentUserId() userId: string,
    @Param('sportCode') sportCode: string,
    @Body() body: { skillLevel: SportSkillLevel },
  ) {
    return this.service.patchSportProfile(userId, sportCode, body);
  }

  @UseGuards(MockAuthGuard)
  @Get('me/wallet/summary')
  wallet(@CurrentUserId() userId: string) {
    return this.service.getWalletSummary(userId);
  }

  @UseGuards(OptionalMockAuthGuard)
  @Get('users/:id/public-profile')
  publicProfile(@Param('id') id: string, @OptionalUserId() viewerId: string | null) {
    return this.service.getPublicProfile(id, viewerId);
  }
}
