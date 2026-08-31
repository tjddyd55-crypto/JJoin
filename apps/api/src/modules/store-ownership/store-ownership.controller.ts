import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { CreateStoreOwnershipRequest, OwnerDashboardPeriod } from '@jjoin/types';
import { StoreOwnershipService } from './store-ownership.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller()
export class StoreOwnershipController {
  constructor(private readonly service: StoreOwnershipService) {}

  @Post('store-verifications')
  @UseGuards(MockAuthGuard)
  create(@CurrentUserId() userId: string, @Body() body: CreateStoreOwnershipRequest) {
    return this.service.createRequest(userId, body);
  }

  @Get('store-verifications/me')
  @UseGuards(MockAuthGuard)
  myRequests(@CurrentUserId() userId: string) {
    return this.service.listMyRequests(userId);
  }

  @Get('my-stores')
  @UseGuards(MockAuthGuard)
  myStores(
    @CurrentUserId() userId: string,
    @Query('includeWallet') includeWallet?: string,
  ) {
    return this.service.listMyStores(userId, includeWallet === '1' || includeWallet === 'true');
  }

  @Get('my-stores/:ownershipId/dashboard')
  @UseGuards(MockAuthGuard)
  ownerDashboard(
    @CurrentUserId() userId: string,
    @Param('ownershipId') ownershipId: string,
    @Query('period') period?: string,
  ) {
    const allowed: OwnerDashboardPeriod[] = ['month', '30d', 'all'];
    const resolved: OwnerDashboardPeriod =
      period && (allowed as string[]).includes(period)
        ? (period as OwnerDashboardPeriod)
        : 'month';
    return this.service.getOwnerDashboard(userId, ownershipId, resolved);
  }
}
