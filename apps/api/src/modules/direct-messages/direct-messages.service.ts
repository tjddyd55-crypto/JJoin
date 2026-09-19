import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  directMessageFeeIdempotencyKey,
  directMessageReceivedEventKey,
  evaluateConversationAccess,
  evaluateSendMessagePolicy,
  isPremiumActive,
  normalizeDirectMessageBody,
  normalizeDirectMessageIdempotencyKey,
  orderDirectConversationPair,
  peerUserIdFromPair,
  previewDirectMessage,
} from '@jjoin/domain';
import type {
  DirectConversationDto,
  DirectConversationsResponse,
  DirectMessageDto,
  DirectMessagesResponse,
  DirectUnreadCountDto,
} from '@jjoin/types';
import { createDirectConversationSchema, postDirectMessageSchema } from '@jjoin/validation';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { PremiumService } from '../payments/premium.service';
import { CoinLedgerService, InsufficientBalanceError } from '../wallet/coin-ledger.service';
import { UserAccountService } from '../users/user-account.service';
import { MessagePolicyService } from './message-policy.service';

const RATE_LIMIT_WINDOW_MS = 200;
const RATE_LIMIT_MAX = 5;

@Injectable()
export class DirectMessagesService {
  private readonly postTimestamps = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: MessagePolicyService,
    private readonly premium: PremiumService,
    private readonly ledger: CoinLedgerService,
    private readonly notifications: NotificationEventService,
    private readonly accounts: UserAccountService,
  ) {}

  async getOrCreateConversation(
    viewerId: string,
    body: unknown,
  ): Promise<DirectConversationDto> {
    const parsed = createDirectConversationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'direct_conversation_invalid',
        issues: parsed.error.issues,
      });
    }
    await this.assertCanAccess(viewerId, parsed.data.peerUserId);
    const conversation = await this.ensureConversation(viewerId, parsed.data.peerUserId);
    return this.toConversationDto(viewerId, conversation.id);
  }

  async listConversations(viewerId: string): Promise<DirectConversationsResponse> {
    const memberships = await this.prisma.directConversationMember.findMany({
      where: { userId: viewerId },
      include: { conversation: true },
      orderBy: { conversation: { lastMessageAt: { sort: 'desc', nulls: 'last' } } },
    });
    const items: DirectConversationDto[] = [];
    for (const row of memberships) {
      const peerUserId = peerUserIdFromPair(
        { userLowId: row.conversation.userLowId, userHighId: row.conversation.userHighId },
        viewerId,
      );
      if (!(await this.canAccess(viewerId, peerUserId))) continue;
      items.push(await this.toConversationDto(viewerId, row.conversationId));
    }
    return { items };
  }

  async getConversation(viewerId: string, conversationId: string): Promise<DirectConversationDto> {
    await this.requireAccessibleConversation(viewerId, conversationId);
    return this.toConversationDto(viewerId, conversationId);
  }

  async listMessages(
    viewerId: string,
    conversationId: string,
    opts: { cursor?: string; limit?: number },
  ): Promise<DirectMessagesResponse> {
    await this.requireAccessibleConversation(viewerId, conversationId);
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 50);
    const rows = await this.prisma.directMessage.findMany({
      where: {
        conversationId,
        ...(opts.cursor ? { createdAt: { lt: new Date(opts.cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
    const slice = rows.slice(0, limit);
    const next = rows.length > limit ? slice[slice.length - 1]?.createdAt.toISOString() ?? null : null;
    return {
      items: slice.reverse().map((row) => this.toMessageDto(row, viewerId)),
      nextCursor: next,
    };
  }

  async postMessage(
    viewerId: string,
    conversationId: string,
    body: unknown,
  ): Promise<DirectMessageDto> {
    this.assertRateLimit(viewerId);
    const parsed = postDirectMessageSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'direct_message_invalid',
        issues: parsed.error.issues,
      });
    }
    const conversation = await this.requireMembership(viewerId, conversationId);
    const peerUserId = peerUserIdFromPair(
      { userLowId: conversation.userLowId, userHighId: conversation.userHighId },
      viewerId,
    );
    let normalizedBody: string;
    try {
      normalizedBody = normalizeDirectMessageBody(parsed.data.body);
    } catch {
      throw new BadRequestException('invalid_message_body');
    }

    const policy = await this.policy.snapshot();
    const access = await this.loadAccessContext(viewerId, peerUserId);
    const decision = evaluateSendMessagePolicy({
      policy,
      fromUserId: viewerId,
      toUserId: peerUserId,
      ...access,
    });
    if (!decision.ok) {
      this.throwPolicy(decision.code);
    }

    const messageKey = normalizeDirectMessageIdempotencyKey(parsed.data.idempotencyKey, viewerId);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.directMessage.findUnique({ where: { idempotencyKey: messageKey } });
        if (existing) {
          return { message: existing, alreadyExists: true };
        }

        let feeTxId: string | null = null;
        if (decision.ok && decision.coinCost > 0) {
          const fee = await this.ledger.applyDirectMessageFee(tx, {
            userId: viewerId,
            amount: String(decision.coinCost),
            conversationId,
            idempotencyKey: directMessageFeeIdempotencyKey(messageKey),
          });
          feeTxId = fee?.id ?? null;
        }

        const created = await tx.directMessage.create({
          data: {
            conversationId,
            senderUserId: viewerId,
            body: normalizedBody,
            idempotencyKey: messageKey,
            feeTxId,
          },
        });
        await tx.directConversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: created.createdAt,
            lastMessagePreview: previewDirectMessage(normalizedBody),
          },
        });
        await tx.directConversationMember.update({
          where: { conversationId_userId: { conversationId, userId: viewerId } },
          data: { lastReadAt: created.createdAt },
        });
        return { message: created, alreadyExists: false };
      });

      if (!result.alreadyExists) {
        const senderNickname = await this.resolveNickname(viewerId);
        await this.notifications.enqueueSafe({
          userId: peerUserId,
          type: NotificationType.DIRECT_MESSAGE_RECEIVED,
          title: '새 메시지',
          body: `${senderNickname}: ${previewDirectMessage(normalizedBody)}`,
          data: {
            type: NotificationType.DIRECT_MESSAGE_RECEIVED,
            conversationId,
            fromUserId: viewerId,
          },
          eventKey: directMessageReceivedEventKey(result.message.id),
        });
      }
      return this.toMessageDto(result.message, viewerId);
    } catch (e) {
      if (e instanceof InsufficientBalanceError) {
        throw new BadRequestException('insufficient_available');
      }
      throw e;
    }
  }

  async markRead(viewerId: string, conversationId: string): Promise<DirectConversationDto> {
    await this.requireAccessibleConversation(viewerId, conversationId);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.directConversationMember.update({
        where: { conversationId_userId: { conversationId, userId: viewerId } },
        data: { lastReadAt: now },
      });
      await tx.directMessage.updateMany({
        where: {
          conversationId,
          senderUserId: { not: viewerId },
          readAt: null,
        },
        data: { readAt: now },
      });
    });
    return this.toConversationDto(viewerId, conversationId);
  }

  async unreadCount(viewerId: string): Promise<DirectUnreadCountDto> {
    const memberships = await this.prisma.directConversationMember.findMany({
      where: { userId: viewerId },
      include: { conversation: true },
    });
    let unreadCount = 0;
    for (const row of memberships) {
      const peerUserId = peerUserIdFromPair(
        { userLowId: row.conversation.userLowId, userHighId: row.conversation.userHighId },
        viewerId,
      );
      if (!(await this.canAccess(viewerId, peerUserId))) continue;
      unreadCount += await this.prisma.directMessage.count({
        where: {
          conversationId: row.conversationId,
          senderUserId: { not: viewerId },
          createdAt: row.lastReadAt ? { gt: row.lastReadAt } : undefined,
        },
      });
    }
    return { unreadCount };
  }

  private async requireAccessibleConversation(viewerId: string, conversationId: string) {
    const conversation = await this.requireMembership(viewerId, conversationId);
    await this.assertCanAccess(
      viewerId,
      peerUserIdFromPair(
        { userLowId: conversation.userLowId, userHighId: conversation.userHighId },
        viewerId,
      ),
    );
    return conversation;
  }

  private async canAccess(viewerId: string, peerUserId: string): Promise<boolean> {
    try {
      await this.assertCanAccess(viewerId, peerUserId);
      return true;
    } catch {
      return false;
    }
  }

  private async assertCanAccess(viewerId: string, peerUserId: string): Promise<void> {
    const policy = await this.policy.snapshot();
    const access = await this.loadAccessContext(viewerId, peerUserId);
    const decision = evaluateConversationAccess({
      policy,
      fromUserId: viewerId,
      toUserId: peerUserId,
      isPremiumActive: access.isPremiumActive,
      isAcceptedFriend: access.isAcceptedFriend,
      isBlockedEitherWay: access.isBlockedEitherWay,
    });
    if (!decision.ok) this.throwPolicy(decision.code);
  }

  private async loadAccessContext(viewerId: string, peerUserId: string) {
    const peer = await this.prisma.user.findUnique({ where: { id: peerUserId }, select: { id: true } });
    if (!peer) throw new NotFoundException('message_peer_not_found');
    const [premium, friendship, blocked, wallet] = await Promise.all([
      this.premium.getStatus(viewerId),
      this.prisma.userFriendship.findFirst({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: viewerId, addresseeId: peerUserId },
            { requesterId: peerUserId, addresseeId: viewerId },
          ],
        },
        select: { id: true },
      }),
      this.prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerUserId: viewerId, blockedUserId: peerUserId },
            { blockerUserId: peerUserId, blockedUserId: viewerId },
          ],
        },
        select: { id: true },
      }),
      this.prisma.wallet.findFirst({
        where: { userId: viewerId },
        select: { availableBalance: true },
      }),
    ]);
    return {
      isPremiumActive: premium.active === true || isPremiumActive(premium.expiresAt),
      isAcceptedFriend: Boolean(friendship),
      isBlockedEitherWay: Boolean(blocked),
      availableBalance: wallet ? String(wallet.availableBalance) : '0',
    };
  }

  private async ensureConversation(viewerId: string, peerUserId: string) {
    const pair = orderDirectConversationPair(viewerId, peerUserId);
    const existing = await this.prisma.directConversation.findUnique({
      where: { userLowId_userHighId: { userLowId: pair.userLowId, userHighId: pair.userHighId } },
    });
    if (existing) return existing;
    try {
      return await this.prisma.directConversation.create({
        data: {
          userLowId: pair.userLowId,
          userHighId: pair.userHighId,
          members: {
            create: [{ userId: pair.userLowId }, { userId: pair.userHighId }],
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const raced = await this.prisma.directConversation.findUnique({
          where: { userLowId_userHighId: { userLowId: pair.userLowId, userHighId: pair.userHighId } },
        });
        if (raced) return raced;
      }
      throw e;
    }
  }

  private async requireMembership(viewerId: string, conversationId: string) {
    const conversation = await this.prisma.directConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('conversation_not_found');
    const member = await this.prisma.directConversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: viewerId } },
    });
    if (!member) throw new ForbiddenException('conversation_forbidden');
    return conversation;
  }

  private async toConversationDto(
    viewerId: string,
    conversationId: string,
  ): Promise<DirectConversationDto> {
    const conversation = await this.prisma.directConversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    const member = await this.prisma.directConversationMember.findUniqueOrThrow({
      where: { conversationId_userId: { conversationId, userId: viewerId } },
    });
    const peerUserId = peerUserIdFromPair(
      { userLowId: conversation.userLowId, userHighId: conversation.userHighId },
      viewerId,
    );
    const [peer, unreadCount] = await Promise.all([
      this.accounts.getPublicProfile(peerUserId, viewerId).catch(async () => ({
        id: peerUserId,
        nickname: await this.resolveNickname(peerUserId),
        avatarUrl: null as string | null,
      })),
      this.prisma.directMessage.count({
        where: {
          conversationId,
          senderUserId: { not: viewerId },
          createdAt: member.lastReadAt ? { gt: member.lastReadAt } : undefined,
        },
      }),
    ]);
    return {
      id: conversation.id,
      peer: {
        userId: peer.id,
        nickname: peer.nickname,
        avatarUrl: peer.avatarUrl ?? null,
      },
      lastMessagePreview: conversation.lastMessagePreview,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      unreadCount,
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  private toMessageDto(
    row: {
      id: string;
      conversationId: string;
      senderUserId: string;
      body: string;
      createdAt: Date;
      readAt: Date | null;
    },
    viewerId: string,
  ): DirectMessageDto {
    return {
      id: row.id,
      conversationId: row.conversationId,
      senderUserId: row.senderUserId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      mine: row.senderUserId === viewerId,
    };
  }

  private async resolveNickname(userId: string): Promise<string> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { nickname: true },
    });
    return profile?.nickname ?? '회원';
  }

  private assertRateLimit(userId: string) {
    const now = Date.now();
    const recent = (this.postTimestamps.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX) {
      throw new BadRequestException('direct_message_rate_limited');
    }
    recent.push(now);
    this.postTimestamps.set(userId, recent);
  }

  private throwPolicy(code: string): never {
    if (code === 'self_message_forbidden' || code === 'messaging_disabled') {
      throw new BadRequestException(code);
    }
    if (code === 'insufficient_available' || code === 'invalid_message_body') {
      throw new BadRequestException(code);
    }
    throw new ForbiddenException(code);
  }
}
