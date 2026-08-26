import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { RejectStoreVerificationRequest, StoreVerificationStatus } from '@jjoin/types';
import { StoreOwnershipService } from './store-ownership.service';
import { AdminGuard } from '../../common/admin.guard';
import { CurrentUserId } from '../../common/mock-auth.guard';

@Controller('admin/store-verifications')
@UseGuards(AdminGuard)
export class AdminStoreOwnershipController {
  constructor(private readonly service: StoreOwnershipService) {}

  @Get()
  list(@Query('status') status?: StoreVerificationStatus) {
    return this.service.listAdminRequests(status);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUserId() adminUserId: string) {
    return this.service.approveRequest(id, adminUserId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: RejectStoreVerificationRequest,
  ) {
    return this.service.rejectRequest(id, adminUserId, body);
  }

  @Post(':id/revoke')
  revoke(@Param('id') id: string, @CurrentUserId() adminUserId: string) {
    return this.service.revokeRequest(id, adminUserId);
  }
}
