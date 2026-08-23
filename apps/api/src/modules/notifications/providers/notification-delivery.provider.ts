export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  channelId?: string;
};

export type PushSendResult = {
  token: string;
  ok: boolean;
  ticketId?: string;
  errorCode?: string;
  errorMessage?: string;
  invalidateToken?: boolean;
};

export interface NotificationDeliveryProvider {
  sendPush(messages: PushMessage[]): Promise<PushSendResult[]>;
}

export const NOTIFICATION_DELIVERY_PROVIDER = Symbol('NOTIFICATION_DELIVERY_PROVIDER');
