import { Injectable } from '@nestjs/common';
import {
  DEFAULT_FIELD_NOTIFICATION_REGION_MODE,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_SCREEN_NOTIFICATION_RADIUS_MODE,
  parseFieldRegionsJson,
  type FieldNotificationRegion,
  type FieldNotificationRegionMode,
  type NotificationPreferenceFields,
  type ScreenNotificationRadiusMode,
} from '@jjoin/domain';
import { PrismaService } from '../../prisma/prisma.service';

export type StoredNotificationPreference = NotificationPreferenceFields & {
  screenRadiusMode: ScreenNotificationRadiusMode;
  fieldRegionMode: FieldNotificationRegionMode;
  fieldRegions: FieldNotificationRegion[];
};

@Injectable()
export class NotificationPreferenceStore {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string): Promise<StoredNotificationPreference> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return this.toStored(row);
  }

  async update(
    userId: string,
    patch: Partial<StoredNotificationPreference>,
  ): Promise<StoredNotificationPreference> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        screenRadiusMode: patch.screenRadiusMode ?? DEFAULT_SCREEN_NOTIFICATION_RADIUS_MODE,
        fieldRegionMode: patch.fieldRegionMode ?? DEFAULT_FIELD_NOTIFICATION_REGION_MODE,
        fieldRegions: patch.fieldRegions ?? [],
        ...this.booleanCreatePatch(patch),
      },
      update: this.toUpdateData(patch),
    });
    return this.toStored(row);
  }

  private booleanCreatePatch(patch: Partial<StoredNotificationPreference>) {
    return {
      joinAlertsEnabled: patch.joinAlertsEnabled,
      followedStoreEnabled: patch.followedStoreEnabled,
      urgentJoinEnabled: patch.urgentJoinEnabled,
      invitationEnabled: patch.invitationEnabled,
      attendanceReminderEnabled: patch.attendanceReminderEnabled,
      bookmarkUpdatesEnabled: patch.bookmarkUpdatesEnabled,
      profileMatchEnabled: patch.profileMatchEnabled,
      joinCreatedEnabled: patch.joinCreatedEnabled,
    };
  }

  private toUpdateData(patch: Partial<StoredNotificationPreference>) {
    return {
      ...this.booleanCreatePatch(patch),
      ...(patch.screenRadiusMode ? { screenRadiusMode: patch.screenRadiusMode } : {}),
      ...(patch.fieldRegionMode ? { fieldRegionMode: patch.fieldRegionMode } : {}),
      ...(patch.fieldRegions ? { fieldRegions: patch.fieldRegions } : {}),
    };
  }

  private toStored(row: {
    joinAlertsEnabled: boolean;
    followedStoreEnabled: boolean;
    urgentJoinEnabled: boolean;
    invitationEnabled: boolean;
    attendanceReminderEnabled: boolean;
    bookmarkUpdatesEnabled: boolean;
    profileMatchEnabled: boolean;
    joinCreatedEnabled: boolean;
    screenRadiusMode: string;
    fieldRegionMode: string;
    fieldRegions: unknown;
  }): StoredNotificationPreference {
    return {
      joinAlertsEnabled: row.joinAlertsEnabled,
      followedStoreEnabled: row.followedStoreEnabled,
      urgentJoinEnabled: row.urgentJoinEnabled,
      invitationEnabled: row.invitationEnabled,
      attendanceReminderEnabled: row.attendanceReminderEnabled,
      bookmarkUpdatesEnabled: row.bookmarkUpdatesEnabled,
      profileMatchEnabled: row.profileMatchEnabled,
      joinCreatedEnabled: row.joinCreatedEnabled,
      screenRadiusMode: row.screenRadiusMode as ScreenNotificationRadiusMode,
      fieldRegionMode: row.fieldRegionMode as FieldNotificationRegionMode,
      fieldRegions: parseFieldRegionsJson(row.fieldRegions),
    };
  }
}
