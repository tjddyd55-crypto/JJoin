import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { PushDevicesController } from './push-devices.controller';
import { NotificationsService } from './notifications.service';
import { PushDevicesService } from './push-devices.service';
import { NotificationEventService } from './notification-event.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationPreferenceStore } from './notification-preference.store';
import { NOTIFICATION_DELIVERY_PROVIDER } from './providers/notification-delivery.provider';
import { ExpoPushNotificationProvider } from './providers/expo-push.provider';
import { NullPushNotificationProvider } from './providers/null-push.provider';

@Module({
  controllers: [NotificationsController, PushDevicesController],
  providers: [
    NotificationsService,
    PushDevicesService,
    NotificationEventService,
    NotificationDeliveryService,
    NotificationPreferenceStore,
    ExpoPushNotificationProvider,
    NullPushNotificationProvider,
    {
      provide: NOTIFICATION_DELIVERY_PROVIDER,
      inject: [ExpoPushNotificationProvider, NullPushNotificationProvider],
      useFactory: (
        expo: ExpoPushNotificationProvider,
        nullProvider: NullPushNotificationProvider,
      ) => {
        const mode = (process.env.PUSH_PROVIDER ?? 'expo').toLowerCase();
        if (mode === 'null' || mode === 'none' || mode === 'off') {
          return nullProvider;
        }
        return expo;
      },
    },
  ],
  exports: [
    NotificationEventService,
    NotificationDeliveryService,
    PushDevicesService,
    NotificationPreferenceStore,
  ],
})
export class NotificationsModule {}
