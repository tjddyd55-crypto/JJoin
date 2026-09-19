import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DEFAULT_MESSAGE_POLICY,
  MESSAGE_POLICY_SETTINGS_ID,
  assertMessagePolicy,
  normalizeMessagePolicy,
  type MessagePolicySnapshot,
} from '@jjoin/domain';
import type { MessagePolicyDto } from '@jjoin/types';
import { updateMessagePolicySchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessagePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(): Promise<MessagePolicyDto> {
    const row = await this.prisma.messagePolicySettings.upsert({
      where: { id: MESSAGE_POLICY_SETTINGS_ID },
      create: {
        id: MESSAGE_POLICY_SETTINGS_ID,
        enabled: DEFAULT_MESSAGE_POLICY.enabled,
        premiumOnly: DEFAULT_MESSAGE_POLICY.premiumOnly,
        coinCostPerMessage: DEFAULT_MESSAGE_POLICY.coinCostPerMessage,
        friendsOnly: DEFAULT_MESSAGE_POLICY.friendsOnly,
      },
      update: {},
    });
    return normalizeMessagePolicy({
      enabled: row.enabled,
      premiumOnly: row.premiumOnly,
      coinCostPerMessage: row.coinCostPerMessage,
      friendsOnly: row.friendsOnly,
    });
  }

  async updatePolicy(body: unknown, updatedBy?: string): Promise<MessagePolicyDto> {
    const parsed = updateMessagePolicySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'message_policy_invalid',
        issues: parsed.error.issues,
      });
    }
    const current = await this.getPolicy();
    const next = assertMessagePolicy({
      ...current,
      ...parsed.data,
    });
    await this.prisma.messagePolicySettings.upsert({
      where: { id: MESSAGE_POLICY_SETTINGS_ID },
      create: {
        id: MESSAGE_POLICY_SETTINGS_ID,
        ...next,
        updatedBy: updatedBy ?? null,
      },
      update: { ...next, updatedBy: updatedBy ?? null },
    });
    return this.getPolicy();
  }

  async snapshot(): Promise<MessagePolicySnapshot> {
    return this.getPolicy();
  }
}
