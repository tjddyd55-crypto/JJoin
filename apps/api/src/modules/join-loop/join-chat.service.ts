import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CHAT_MESSAGE_MAX_LENGTH,
  canAccessJoinChat,
  chatHideAfterFrom,
  chatPurgeAfterFrom,
  isJoinChatVisibleInUi,
  normalizeChatMessageBody,
  resolveChatRoomLifecycleStatus,
} from '@jjoin/domain';
import type {
  JoinChatMessageDto,
  JoinChatMessagesResponse,
  JoinChatRoomDto,
  PostJoinChatMessageRequest,
} from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { extractCronSecret, matchesCronSecret } from '../../common/cron-secret';

const CHAT_MEMBER_STATUSES = ['APPROVED', 'CONFIRMED'] as const;
const RATE_LIMIT_WINDOW_MS = 200;
const RATE_LIMIT_MAX = 5;

@Injectable()
export class JoinChatService {
  private readonly logger = new Logger(JoinChatService.name);
  /** In-memory post rate limit: userId → timestamps (ms). */
  private readonly postTimestamps = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create room when join is CONFIRMED or has ≥1 APPROVED besides host.
   * Sync members from HOST + APPROVED/CONFIRMED participants.
   */
  async ensureRoomForJoin(joinId: string): Promise<string | null> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: { participants: true, chatRoom: true },
    });
    if (!join) return null;
    if (join.status === 'CANCELLED' || join.status === 'COMPLETED') {
      if (join.chatRoom) return join.chatRoom.id;
      return null;
    }

    const approvedOthers = join.participants.filter(
      (p) =>
        p.role !== 'HOST' &&
        (p.participationStatus === 'APPROVED' || p.participationStatus === 'CONFIRMED'),
    );
    const shouldExist = join.status === 'CONFIRMED' || approvedOthers.length >= 1;
    if (!shouldExist && !join.chatRoom) return null;

    let roomId = join.chatRoom?.id;
    if (!roomId) {
      const created = await this.prisma.joinChatRoom.create({
        data: { joinId, status: 'ACTIVE' },
      });
      roomId = created.id;
      await this.postSystemMessage(roomId, '조인 채팅방이 열렸습니다.');
    }

    await this.syncMembers(roomId, join);
    return roomId;
  }

  async removeMember(joinId: string, userId: string): Promise<void> {
    const room = await this.prisma.joinChatRoom.findUnique({ where: { joinId } });
    if (!room) return;

    const member = await this.prisma.joinChatMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    if (!member || member.leftAt) return;

    await this.prisma.joinChatMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { nickname: true },
    });
    await this.postSystemMessage(
      room.id,
      `${profile?.nickname ?? '참가자'}님이 나갔습니다.`,
    );
  }

  async onMemberJoined(joinId: string, userId: string): Promise<void> {
    const roomId = await this.ensureRoomForJoin(joinId);
    if (!roomId) return;
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { nickname: true },
    });
    await this.postSystemMessage(
      roomId,
      `${profile?.nickname ?? '참가자'}님이 참여했습니다.`,
    );
  }

  async onJoinTimeChanged(joinId: string): Promise<void> {
    const room = await this.prisma.joinChatRoom.findUnique({ where: { joinId } });
    if (!room || room.status !== 'ACTIVE') return;
    await this.postSystemMessage(room.id, '조인 시간이 변경되었습니다.');
  }

  async onJoinTerminal(joinId: string, kind: 'COMPLETED' | 'CANCELLED'): Promise<void> {
    const now = new Date();
    const room = await this.prisma.joinChatRoom.findUnique({ where: { joinId } });
    if (!room) return;

    await this.prisma.joinChatRoom.update({
      where: { id: room.id },
      data: {
        status: 'READ_ONLY',
        closedAt: null,
        hideAfter: chatHideAfterFrom(now),
        purgeAfter: chatPurgeAfterFrom(now),
      },
    });

    const body =
      kind === 'CANCELLED'
        ? '조인이 취소되어 채팅이 읽기 전용으로 전환되었습니다.'
        : '조인이 종료되어 채팅이 읽기 전용으로 전환되었습니다.';
    await this.postSystemMessage(room.id, body);
  }

  async getRoom(joinId: string, userId: string): Promise<JoinChatRoomDto> {
    await this.ensureRoomForJoin(joinId);
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        participants: { where: { userId } },
        chatRoom: true,
      },
    });
    if (!join) throw new NotFoundException('join_not_found');
    if (!join.chatRoom) throw new NotFoundException('chat_room_not_found');

    const mine = join.participants[0];
    const role = mine?.role ?? (join.hostUserId === userId ? 'HOST' : null);
    const allowed = canAccessJoinChat({
      role,
      participationStatus: mine?.participationStatus ?? (role === 'HOST' ? 'APPROVED' : null),
      attendanceIntent: mine?.attendanceIntent,
    });
    if (!allowed) throw new ForbiddenException('chat_access_denied');

    if (
      !isJoinChatVisibleInUi({
        hasRoom: true,
        roomStatus: join.chatRoom.status,
        hideAfter: join.chatRoom.hideAfter,
      })
    ) {
      throw new ForbiddenException('chat_hidden');
    }

    const member = await this.prisma.joinChatMember.findUnique({
      where: { roomId_userId: { roomId: join.chatRoom.id, userId } },
    });
    if (!member || member.leftAt) {
      throw new ForbiddenException('chat_membership_required');
    }

    const lifecycle = resolveChatRoomLifecycleStatus(
      join.status,
      new Date(),
      join.scheduledEndAt,
    );
    const canPost =
      lifecycle === 'ACTIVE' &&
      join.chatRoom.status === 'ACTIVE' &&
      mine?.attendanceIntent !== 'DECLINED';

    return {
      roomId: join.chatRoom.id,
      joinId,
      status: join.chatRoom.status as JoinChatRoomDto['status'],
      canPost,
      hideAfter: join.chatRoom.hideAfter?.toISOString() ?? null,
      purgeAfter: join.chatRoom.purgeAfter?.toISOString() ?? null,
      createdAt: join.chatRoom.createdAt.toISOString(),
    };
  }

  /**
   * Newest-first cursor pagination.
   * `before` = ISO createdAt of the oldest message from the previous page.
   */
  async listMessages(
    joinId: string,
    userId: string,
    opts?: { before?: string; limit?: number },
  ): Promise<JoinChatMessagesResponse> {
    const roomDto = await this.getRoom(joinId, userId);
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);

    const before = opts?.before ? new Date(opts.before) : null;
    if (before && Number.isNaN(before.getTime())) {
      throw new BadRequestException('invalid_before_cursor');
    }

    const rows = await this.prisma.joinChatMessage.findMany({
      where: {
        roomId: roomDto.roomId,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      include: { sender: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map((m) => this.toMessageDto(m));
    const nextCursor =
      hasMore && page.length > 0
        ? page[page.length - 1]!.createdAt.toISOString()
        : null;

    return { items, nextCursor };
  }

  async postMessage(
    joinId: string,
    userId: string,
    body: PostJoinChatMessageRequest,
  ): Promise<JoinChatMessageDto> {
    this.assertRateLimit(userId);

    let normalized: string;
    try {
      normalized = normalizeChatMessageBody(body?.body ?? '');
    } catch (e) {
      const code = e instanceof Error ? e.message : 'invalid_message';
      throw new BadRequestException(code);
    }
    if (normalized.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException('chat_message_too_long');
    }

    const roomDto = await this.getRoom(joinId, userId);
    if (!roomDto.canPost) {
      throw new ForbiddenException('chat_read_only');
    }

    const created = await this.prisma.joinChatMessage.create({
      data: {
        roomId: roomDto.roomId,
        senderUserId: userId,
        kind: 'TEXT',
        body: normalized,
      },
      include: { sender: { include: { profile: true } } },
    });

    return this.toMessageDto(created);
  }

  async purgeRun(secretHeaders: {
    'x-settlement-cron-secret'?: string;
    authorization?: string;
  }): Promise<{
    purgedRooms: number;
    purgedMessages: number;
    purgedMembers: number;
    failedJobs: number;
  }> {
    const expected = process.env.SETTLEMENT_CRON_SECRET?.trim();
    if (!expected) {
      throw new UnauthorizedException('cron_secret_not_configured');
    }
    const provided = extractCronSecret(secretHeaders);
    if (!matchesCronSecret(provided, expected)) {
      throw new UnauthorizedException('invalid_cron_secret');
    }

    const now = new Date();
    const rooms = await this.prisma.joinChatRoom.findMany({
      where: {
        purgeAfter: { lte: now },
        status: { not: 'CLOSED' },
      },
      select: { id: true, joinId: true },
      take: 100,
    });

    let purgedRooms = 0;
    let purgedMessages = 0;
    let purgedMembers = 0;
    let failedJobs = 0;

    for (const room of rooms) {
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          // Idempotent: skip if another worker closed the room mid-loop.
          const current = await tx.joinChatRoom.findUnique({
            where: { id: room.id },
            select: { status: true },
          });
          if (!current || current.status === 'CLOSED') {
            return { messages: 0, members: 0, closed: false };
          }
          const messages = await tx.joinChatMessage.deleteMany({
            where: { roomId: room.id },
          });
          const members = await tx.joinChatMember.deleteMany({
            where: { roomId: room.id },
          });
          await tx.joinChatRoom.update({
            where: { id: room.id },
            data: { status: 'CLOSED', closedAt: now },
          });
          return {
            messages: messages.count,
            members: members.count,
            closed: true,
          };
        });
        if (result.closed) {
          purgedRooms += 1;
          purgedMessages += result.messages;
          purgedMembers += result.members;
        }
      } catch (e) {
        failedJobs += 1;
        const msg = e instanceof Error ? e.message : 'purge_failed';
        this.logger.error(
          `chat purge failed roomId=${room.id} joinId=${room.joinId} err=${msg}`,
        );
      }
    }

    // NEVER delete Join / JoinParticipant / attendance / played-together rows.
    this.logger.log(
      `chat purge-run purgedRooms=${purgedRooms} purgedMessages=${purgedMessages} purgedMembers=${purgedMembers} failedJobs=${failedJobs}`,
    );
    return { purgedRooms, purgedMessages, purgedMembers, failedJobs };
  }

  private async syncMembers(
    roomId: string,
    join: {
      hostUserId: string;
      participants: Array<{
        userId: string;
        role: string;
        participationStatus: string;
        attendanceIntent: string;
      }>;
    },
  ): Promise<void> {
    const eligibleUserIds = new Set<string>();
    eligibleUserIds.add(join.hostUserId);
    for (const p of join.participants) {
      if (p.attendanceIntent === 'DECLINED') continue;
      if (p.role === 'HOST') {
        eligibleUserIds.add(p.userId);
        continue;
      }
      if (CHAT_MEMBER_STATUSES.includes(p.participationStatus as (typeof CHAT_MEMBER_STATUSES)[number])) {
        eligibleUserIds.add(p.userId);
      }
    }

    const existing = await this.prisma.joinChatMember.findMany({ where: { roomId } });
    const existingByUser = new Map(existing.map((m) => [m.userId, m]));

    for (const userId of eligibleUserIds) {
      const row = existingByUser.get(userId);
      if (!row) {
        await this.prisma.joinChatMember.create({
          data: { roomId, userId },
        });
      } else if (row.leftAt) {
        await this.prisma.joinChatMember.update({
          where: { id: row.id },
          data: { leftAt: null, joinedAt: new Date() },
        });
      }
    }

    for (const row of existing) {
      if (!eligibleUserIds.has(row.userId) && !row.leftAt) {
        await this.prisma.joinChatMember.update({
          where: { id: row.id },
          data: { leftAt: new Date() },
        });
      }
    }
  }

  private async postSystemMessage(roomId: string, body: string): Promise<void> {
    try {
      await this.prisma.joinChatMessage.create({
        data: {
          roomId,
          senderUserId: null,
          kind: 'SYSTEM',
          body,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'system_message_failed';
      this.logger.warn(`system message failed roomId=${roomId} err=${msg}`);
    }
  }

  private assertRateLimit(userId: string): void {
    const now = Date.now();
    const windowStart = now - 1000;
    const prev = (this.postTimestamps.get(userId) ?? []).filter((t) => t >= windowStart);
    if (prev.length >= RATE_LIMIT_MAX) {
      throw new BadRequestException('chat_rate_limited');
    }
    // Also enforce ~5/sec with minimum gap
    const last = prev[prev.length - 1];
    if (last != null && now - last < RATE_LIMIT_WINDOW_MS) {
      throw new BadRequestException('chat_rate_limited');
    }
    prev.push(now);
    this.postTimestamps.set(userId, prev);
  }

  private toMessageDto(m: {
    id: string;
    roomId: string;
    kind: string;
    body: string;
    senderUserId: string | null;
    createdAt: Date;
    sender?: { profile: { nickname: string } | null } | null;
  }): JoinChatMessageDto {
    return {
      messageId: m.id,
      roomId: m.roomId,
      kind: m.kind as JoinChatMessageDto['kind'],
      body: m.body,
      senderUserId: m.senderUserId,
      senderNickname: m.sender?.profile?.nickname ?? null,
      createdAt: m.createdAt.toISOString(),
    };
  }
}
