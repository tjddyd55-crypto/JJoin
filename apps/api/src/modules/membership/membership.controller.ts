import { Controller, Get, UseGuards } from '@nestjs/common';
import { MockAuthGuard, CurrentUserId } from '../../common/mock-auth.guard';
import { MembershipService } from './membership.service';

@Controller('me')
@UseGuards(MockAuthGuard)
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get('membership')
  getMine(@CurrentUserId() userId: string) {
    return this.membership.getUserMembershipDto(userId);
  }
}
