import { Injectable } from '@nestjs/common';
import type {
  NotificationDeliveryProvider,
  PushMessage,
  PushSendResult,
} from './notification-delivery.provider';

/** Test double — fails without throwing. Domain must stay intact. */
@Injectable()
export class NullPushNotificationProvider implements NotificationDeliveryProvider {
  async sendPush(messages: PushMessage[]): Promise<PushSendResult[]> {
    return messages.map((m) => ({
      token: m.to,
      ok: false,
      errorCode: 'null_provider',
      errorMessage: 'PUSH_PROVIDER=null',
    }));
  }
}
