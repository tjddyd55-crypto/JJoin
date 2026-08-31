import { Module } from '@nestjs/common';
import { ProductEventsService } from './product-events.service';
import { AttendanceReminderService } from './attendance-reminder.service';
import {
  AdminGrowthAnalyticsController,
  ProductEventsController,
} from './analytics.controller';
import { AttendanceReminderController } from './attendance-reminder.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [NotificationsModule, AdminModule],
  controllers: [
    AdminGrowthAnalyticsController,
    ProductEventsController,
    AttendanceReminderController,
  ],
  providers: [ProductEventsService, AttendanceReminderService],
  exports: [ProductEventsService, AttendanceReminderService],
})
export class AnalyticsModule {}
