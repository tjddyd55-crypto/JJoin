import { Controller, Headers, Post } from '@nestjs/common';
import { AttendanceReminderService } from './attendance-reminder.service';
import { assertCronAuthorized } from '../../common/cron-secret';

@Controller()
export class AttendanceReminderController {
  constructor(private readonly reminders: AttendanceReminderService) {}

  @Post('notifications/attendance-reminders-run')
  run(@Headers('x-notification-cron-secret') secret?: string) {
    assertCronAuthorized(secret, [
      process.env.NOTIFICATION_CRON_SECRET,
      process.env.SETTLEMENT_CRON_SECRET,
    ]);
    return this.reminders.runBatch();
  }
}
