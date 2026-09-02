import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { JoinCreationCoinPolicyService } from './join-creation-coin-policy.service';

@Controller('me')
export class MeJoinCoinPolicyController {
  constructor(private readonly policy: JoinCreationCoinPolicyService) {}

  /** Current user's effective join-creation coin policy (not full admin matrix). */
  @Get('join-coin-policy')
  @UseGuards(MockAuthGuard)
  getMyPolicy(@CurrentUserId() userId: string) {
    return this.policy.getMyPolicy(userId);
  }
}
