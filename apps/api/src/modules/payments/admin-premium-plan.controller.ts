import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/admin.guard';
import { PremiumSubscriptionService } from '../payments/premium-subscription.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminPremiumPlanController {
  constructor(private readonly premiumPlans: PremiumSubscriptionService) {}

  @Get('premium-plans')
  getPlans() {
    return this.premiumPlans.getPlanSettings();
  }

  @Put('premium-plans')
  updatePlans(@Body() body: unknown) {
    return this.premiumPlans.updatePlanSettings(body);
  }
}
