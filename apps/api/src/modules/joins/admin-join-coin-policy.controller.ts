import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/admin.guard';
import { JoinCreationCoinPolicyService } from './join-creation-coin-policy.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminJoinCoinPolicyController {
  constructor(private readonly policy: JoinCreationCoinPolicyService) {}

  @Get('join-coin-policy')
  getPolicy() {
    return this.policy.getAdminPolicy();
  }

  @Put('join-coin-policy')
  updatePolicy(@Body() body: unknown) {
    return this.policy.updateAdminPolicy(body);
  }
}
