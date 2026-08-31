import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import type { GrowthAnalyticsPeriod } from '@jjoin/types';
import { AdminGuard } from '../../common/admin.guard';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { ProductEventsService } from './product-events.service';

@Controller('admin/analytics')
@UseGuards(AdminGuard)
export class AdminGrowthAnalyticsController {
  constructor(private readonly events: ProductEventsService) {}

  @Get('growth')
  growth(@Query('period') period?: GrowthAnalyticsPeriod) {
    const p = period === '7d' || period === 'all' ? period : '30d';
    return this.events.getGrowthAnalytics(p);
  }
}

@Controller()
export class ProductEventsController {
  constructor(private readonly events: ProductEventsService) {}

  @UseGuards(MockAuthGuard)
  @Post('me/product-events')
  trackAuthenticated(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.events.track(userId, body as never);
  }

  /** Anonymous landing / public share events — no auth. */
  @Post('public/product-events')
  trackPublic(@Body() body: unknown) {
    return this.events.track(null, body as never);
  }
}
