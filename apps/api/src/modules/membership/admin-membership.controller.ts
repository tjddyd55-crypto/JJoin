import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type {
  AdminActivateSubscriptionRequest,
  AdminScheduleCancelSubscriptionRequest,
} from '@jjoin/types';
import { AdminGuard } from '../../common/admin.guard';
import { CurrentUserId } from '../../common/mock-auth.guard';
import { MembershipService } from './membership.service';

@Controller('admin/memberships')
@UseGuards(AdminGuard)
export class AdminMembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get('plans')
  listPlans() {
    return this.membership.listPlans();
  }

  @Get('subscriptions')
  listSubscriptions(
    @Query('userId') userId?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('planCode') planCode?: string,
    @Query('effectivePremium') effectivePremium?: string,
    @Query('cancelScheduled') cancelScheduled?: string,
    @Query('periodEndFrom') periodEndFrom?: string,
    @Query('periodEndTo') periodEndTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.membership.listSubscriptions({
      userId,
      q,
      status,
      planCode,
      effectivePremium:
        effectivePremium === 'true' ? true : effectivePremium === 'false' ? false : undefined,
      cancelScheduled:
        cancelScheduled === 'true' ? true : cancelScheduled === 'false' ? false : undefined,
      periodEndFrom,
      periodEndTo,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('subscriptions/:subscriptionId')
  getSubscription(@Param('subscriptionId') subscriptionId: string) {
    return this.membership.getSubscriptionDetail(subscriptionId);
  }

  @Get('users/:userId')
  getUserMembership(@Param('userId') userId: string) {
    return this.membership.getAdminUserMembershipDetail(userId);
  }

  @Post('subscriptions')
  activate(
    @CurrentUserId() adminUserId: string,
    @Body() body: AdminActivateSubscriptionRequest,
  ) {
    return this.membership.activateSubscription(adminUserId, body);
  }

  @Post('subscriptions/:subscriptionId/cancel')
  scheduleCancel(
    @CurrentUserId() adminUserId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: AdminScheduleCancelSubscriptionRequest,
  ) {
    return this.membership.scheduleCancel(subscriptionId, adminUserId, body.reason);
  }
}
