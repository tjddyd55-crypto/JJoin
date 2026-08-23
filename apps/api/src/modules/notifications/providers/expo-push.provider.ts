import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationDeliveryProvider,
  PushMessage,
  PushSendResult,
} from './notification-delivery.provider';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function maskToken(token: string): string {
  if (token.length <= 8) return '***';
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

@Injectable()
export class ExpoPushNotificationProvider implements NotificationDeliveryProvider {
  private readonly logger = new Logger(ExpoPushNotificationProvider.name);

  async sendPush(messages: PushMessage[]): Promise<PushSendResult[]> {
    if (messages.length === 0) return [];

    const chunks: PushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    const results: PushSendResult[] = [];
    for (const chunk of chunks) {
      results.push(...(await this.sendChunk(chunk)));
    }
    return results;
  }

  private async sendChunk(messages: PushMessage[]): Promise<PushSendResult[]> {
    const payload = messages.map((m) => ({
      to: m.to,
      title: m.title,
      body: m.body,
      data: m.data ?? {},
      sound: m.sound ?? 'default',
      channelId: m.channelId ?? 'jjoin-general',
      priority: 'high' as const,
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`expo_push_http_${res.status}`);
        return messages.map((m) => ({
          token: m.to,
          ok: false,
          errorCode: `http_${res.status}`,
          errorMessage: text.slice(0, 200),
        }));
      }

      const json = (await res.json()) as {
        data?: Array<{
          status: string;
          id?: string;
          message?: string;
          details?: { error?: string };
        }>;
      };

      const tickets = json.data ?? [];
      return messages.map((m, i) => {
        const ticket = tickets[i];
        if (!ticket) {
          return { token: m.to, ok: false, errorCode: 'missing_ticket' };
        }
        if (ticket.status === 'ok') {
          return { token: m.to, ok: true, ticketId: ticket.id };
        }
        const errorCode = ticket.details?.error ?? 'expo_error';
        const invalidate =
          errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials';
        this.logger.warn(`expo_push_fail token=${maskToken(m.to)} code=${errorCode}`);
        return {
          token: m.to,
          ok: false,
          errorCode,
          errorMessage: ticket.message?.slice(0, 200),
          invalidateToken: invalidate,
        };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'network_error';
      this.logger.warn(`expo_push_network ${msg}`);
      return messages.map((m) => ({
        token: m.to,
        ok: false,
        errorCode: 'network_error',
        errorMessage: msg.slice(0, 200),
      }));
    }
  }
}
