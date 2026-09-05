import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
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

  @Get('join-coin-policy/preview')
  getPreview() {
    return this.policy.getAdminPreview();
  }

  @Put('join-coin-policy')
  updatePolicy(@Body() body: unknown, @Req() req: Request) {
    const actorUserId = (req as Request & { adminUserId?: string }).adminUserId;
    return this.policy.updateAdminPolicy(body, actorUserId);
  }
}
