import { Injectable } from '@nestjs/common';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferenceFields,
} from '@jjoin/domain';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationPreferenceStore {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string): Promise<NotificationPreferenceFields> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return {
      joinAlertsEnabled: row.joinAlertsEnabled,
      followedStoreEnabled: row.followedStoreEnabled,
      urgentJoinEnabled: row.urgentJoinEnabled,
      invitationEnabled: row.invitationEnabled,
      attendanceReminderEnabled: row.attendanceReminderEnabled,
      bookmarkUpdatesEnabled: row.bookmarkUpdatesEnabled,
    };
  }

  async update(
    userId: string,
    patch: Partial<NotificationPreferenceFields>,
  ): Promise<NotificationPreferenceFields> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...patch,
      },
      update: patch,
    });
    return {
      joinAlertsEnabled: row.joinAlertsEnabled,
      followedStoreEnabled: row.followedStoreEnabled,
      urgentJoinEnabled: row.urgentJoinEnabled,
      invitationEnabled: row.invitationEnabled,
      attendanceReminderEnabled: row.attendanceReminderEnabled,
      bookmarkUpdatesEnabled: row.bookmarkUpdatesEnabled,
    };
  }
}
