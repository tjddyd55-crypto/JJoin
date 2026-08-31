import { Controller, Headers, Post } from '@nestjs/common';
import { AttendanceReminderService } from './attendance-reminder.service';

@Controller()
export class AttendanceReminderController {
  constructor(private readonly reminders: AttendanceReminderService) {}

  @Post('notifications/attendance-reminders-run')
  run(@Headers('x-notification-cron-secret') secret?: string) {
    const expected =
      process.env.NOTIFICATION_CRON_SECRET ?? process.env.SETTLEMENT_CRON_SECRET;
    if (expected && secret !== expected) {
      return { ok: false, error: 'cron_forbidden' };
    }
    return this.reminders.runBatch();
  }
}
