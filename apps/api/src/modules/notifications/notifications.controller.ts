import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { assertCronAuthorized } from '../../common/cron-secret';

@Controller()
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  @Get('notifications/_meta')
  meta() {
    return { module: 'notifications', status: 'ready', provider: process.env.PUSH_PROVIDER ?? 'expo' };
  }

  /**
   * Ops / cron — deliver pending outbox.
   * Reuses settlement cron secret when NOTIFICATION_CRON_SECRET is unset.
   */
  @Post('notifications/deliver-pending')
  deliverPending(@Headers('x-notification-cron-secret') secret?: string) {
    assertCronAuthorized(secret, [
      process.env.NOTIFICATION_CRON_SECRET,
      process.env.SETTLEMENT_CRON_SECRET,
    ]);
    return this.delivery.deliverPending(
      Number(process.env.NOTIFICATION_DELIVER_BATCH_SIZE ?? 50),
    );
  }

  @UseGuards(MockAuthGuard)
  @Get('me/notifications')
  list(
    @CurrentUserId() userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.list(userId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(MockAuthGuard)
  @Get('me/notifications/unread-count')
  unread(@CurrentUserId() userId: string) {
    return this.notifications.unreadCount(userId);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/notifications/:id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }

  @UseGuards(MockAuthGuard)
  @Post('me/notifications/read-all')
  markAll(@CurrentUserId() userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @UseGuards(MockAuthGuard)
  @Get('me/notification-preference')
  getPreference(@CurrentUserId() userId: string) {
    return this.notifications.getPreference(userId);
  }

  @UseGuards(MockAuthGuard)
  @Patch('me/notification-preference')
  setPreference(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.notifications.setPreference(userId, body);
  }
}
