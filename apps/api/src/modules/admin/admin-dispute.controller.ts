import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { AdminResolveDisputeRequest, DisputeStatus } from '@jjoin/types';
import { AdminDisputeService } from './admin-dispute.service';
import { AdminGuard } from '../../common/admin.guard';
import { CurrentUserId } from '../../common/mock-auth.guard';

@Controller('admin/disputes')
@UseGuards(AdminGuard)
export class AdminDisputeController {
  constructor(private readonly service: AdminDisputeService) {}

  @Get()
  list(
    @Query('status') status?: DisputeStatus,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listDisputes({
      status,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':disputeId')
  detail(@Param('disputeId') disputeId: string) {
    return this.service.getDispute(disputeId);
  }

  @Post(':disputeId/resolve')
  resolve(
    @Param('disputeId') disputeId: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: AdminResolveDisputeRequest,
  ) {
    return this.service.resolveDispute(disputeId, adminUserId, body);
  }
}
