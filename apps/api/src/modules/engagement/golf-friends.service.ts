import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  DEV_DEMO_RECOMMENDED_LIMIT,
  DEV_INVESTOR_DEMO_KEY_MARKER,
  isDevInvestorDemoAvatarStorageKey,
  mergeDevDemoRecommendedUserIds,
} from '@jjoin/domain';
import {
  GolfFriendRelationship,
  type GolfFriendCardDto,
  type GolfFriendsListResponse,
} from '@jjoin/types';
import { isDevelopmentUnsafePathAllowed } from '../../config/app-variant';
import { PrismaService } from '../../prisma/prisma.service';
import { UserAccountService } from '../users/user-account.service';
import { PresenceService } from '../presence/presence.service';
import { NotificationEventService } from '../notifications/notification-event.service';

@Injectable()
export class GolfFriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: UserAccountService,
    private readonly presence: PresenceService,
    private readonly notifications: NotificationEventService,
  ) {}

  async listRecommended(viewerId: string): Promise<GolfFriendsListResponse> {
    const development = isDevelopmentUnsafePathAllowed();
    const [demoUserIds, recentUserIds] = await Promise.all([
      development ? this.findDevInvestorDemoUserIds(viewerId) : Promise.resolve([]),
      this.findRecentlyActiveUserIds(viewerId),
    ]);
    const ids = mergeDevDemoRecommendedUserIds({
      development,
      viewerId,
      demoUserIds,
      recentUserIds,
    });
    return this.toCards(viewerId, ids);
  }

  async listPopular(viewerId: string): Promise<GolfFriendsListResponse> {
    const grouped = await this.prisma.joinParticipant.groupBy({
      by: ['userId'],
      where: {
        participationStatus: { in: ['APPROVED', 'CONFIRMED', 'COMPLETED'] },
        userId: { not: viewerId },
      },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 20,
    });
    const ids = grouped.map((g) => g.userId);
    return this.toCards(viewerId, ids);
  }

  async listNearby(
    viewerId: string,
    latitude: number,
    longitude: number,
  ): Promise<GolfFriendsListResponse> {
    const nearby = await this.presence.listNearbyPublic({
      centerLat: latitude,
      centerLng: longitude,
      viewerUserId: viewerId,
    });
    const ids = nearby.map((u) => u.userId);
    const cards = await this.toCards(viewerId, ids);
    const distanceMap = new Map(nearby.map((u) => [u.userId, u.approxDistanceMeters]));
    return {
      items: cards.items.map((item) => ({
        ...item,
        approxDistanceMeters: distanceMap.get(item.user.id) ?? null,
      })),
    };
  }

  async search(viewerId: string, query: string): Promise<GolfFriendsListResponse> {
    const q = query.trim();
    if (q.length < 2) {
      throw new BadRequestException('query_too_short');
    }
    const rows = await this.prisma.userProfile.findMany({
      where: {
        nickname: { contains: q, mode: 'insensitive' },
        userId: { not: viewerId },
      },
      take: 30,
      select: { userId: true },
    });
    return this.toCards(viewerId, rows.map((r) => r.userId));
  }

  async requestFriend(
    viewerId: string,
    targetUserId: string,
  ): Promise<{ relationship: GolfFriendRelationship }> {
    if (viewerId === targetUserId) {
      throw new BadRequestException('cannot_friend_self');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('user_not_found');

    const existing = await this.findBetween(viewerId, targetUserId);
    if (existing?.status === 'ACCEPTED') {
      return { relationship: GolfFriendRelationship.FRIENDS };
    }
    if (existing?.requesterId === viewerId && existing.status === 'PENDING') {
      return { relationship: GolfFriendRelationship.REQUESTED };
    }
    if (existing?.addresseeId === viewerId && existing.status === 'PENDING') {
      return { relationship: GolfFriendRelationship.RECEIVED };
    }

    try {
      await this.prisma.userFriendship.create({
        data: {
          requesterId: viewerId,
          addresseeId: targetUserId,
          status: 'PENDING',
        },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException('friend_request_exists');
      }
      throw err;
    }

    const requesterNickname = await this.resolveNickname(viewerId);
    await this.notifications.enqueueTypedSafe({
      userId: targetUserId,
      type: NotificationType.FRIEND_REQUEST_RECEIVED,
      targetEntityId: targetUserId,
      actorUserId: viewerId,
      context: { actorNickname: requesterNickname },
      data: { userId: viewerId },
      eventKey: `friendship:${viewerId}:${targetUserId}:requested`,
    });

    return { relationship: GolfFriendRelationship.REQUESTED };
  }

  async acceptFriend(
    viewerId: string,
    targetUserId: string,
  ): Promise<{ relationship: GolfFriendRelationship }> {
    const row = await this.requirePendingBetween(viewerId, targetUserId);
    if (row.addresseeId !== viewerId) {
      throw new ForbiddenException('friend_accept_forbidden');
    }

    await this.prisma.userFriendship.update({
      where: { id: row.id },
      data: { status: 'ACCEPTED' },
    });

    const accepterNickname = await this.resolveNickname(viewerId);
    await this.notifications.enqueueTypedSafe({
      userId: row.requesterId,
      type: NotificationType.FRIEND_REQUEST_ACCEPTED,
      targetEntityId: viewerId,
      actorUserId: viewerId,
      context: { actorNickname: accepterNickname },
      data: { userId: viewerId },
      eventKey: `friendship:${row.requesterId}:${viewerId}:accepted`,
    });

    return { relationship: GolfFriendRelationship.FRIENDS };
  }

  async rejectFriend(
    viewerId: string,
    targetUserId: string,
  ): Promise<{ relationship: GolfFriendRelationship }> {
    const row = await this.requirePendingBetween(viewerId, targetUserId);
    if (row.addresseeId !== viewerId) {
      throw new ForbiddenException('friend_reject_forbidden');
    }

    await this.prisma.userFriendship.delete({ where: { id: row.id } });
    return { relationship: GolfFriendRelationship.NONE };
  }

  async cancelFriendRequest(
    viewerId: string,
    targetUserId: string,
  ): Promise<{ relationship: GolfFriendRelationship }> {
    const row = await this.requirePendingBetween(viewerId, targetUserId);
    if (row.requesterId !== viewerId) {
      throw new ForbiddenException('friend_cancel_forbidden');
    }

    await this.prisma.userFriendship.delete({ where: { id: row.id } });
    return { relationship: GolfFriendRelationship.NONE };
  }

  async unfriend(
    viewerId: string,
    targetUserId: string,
  ): Promise<{ relationship: GolfFriendRelationship }> {
    const row = await this.findBetween(viewerId, targetUserId);
    if (!row || row.status !== 'ACCEPTED') {
      throw new NotFoundException('friendship_not_found');
    }

    await this.prisma.userFriendship.delete({ where: { id: row.id } });
    return { relationship: GolfFriendRelationship.NONE };
  }

  private async requirePendingBetween(viewerId: string, targetUserId: string) {
    const row = await this.findBetween(viewerId, targetUserId);
    if (!row || row.status !== 'PENDING') {
      throw new NotFoundException('friend_request_not_found');
    }
    return row;
  }

  private async resolveNickname(userId: string): Promise<string> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { nickname: true },
    });
    return profile?.nickname ?? '회원';
  }

  private async findRecentlyActiveUserIds(viewerId: string): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        id: { not: viewerId },
        status: 'ACTIVE',
        profile: { isNot: null },
      },
      orderBy: { lastLoginAt: 'desc' },
      take: DEV_DEMO_RECOMMENDED_LIMIT,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async findDevInvestorDemoUserIds(viewerId: string): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        id: { not: viewerId },
        status: 'ACTIVE',
        profile: {
          is: {
            avatarAsset: {
              is: { storageKey: { contains: DEV_INVESTOR_DEMO_KEY_MARKER } },
            },
          },
        },
      },
      orderBy: { profile: { nickname: 'asc' } },
      take: DEV_DEMO_RECOMMENDED_LIMIT,
      select: {
        id: true,
        profile: { select: { avatarAsset: { select: { storageKey: true } } } },
      },
    });
    return rows
      .filter((row) =>
        isDevInvestorDemoAvatarStorageKey(row.profile?.avatarAsset?.storageKey),
      )
      .map((row) => row.id);
  }

  private async toCards(viewerId: string, userIds: string[]): Promise<GolfFriendsListResponse> {
    const unique = [...new Set(userIds)].filter((id) => id !== viewerId);
    const items: GolfFriendCardDto[] = [];
    for (const id of unique) {
      try {
        const user = await this.accounts.getPublicProfile(id, viewerId);
        const relationship = await this.resolveRelationship(viewerId, id);
        items.push({ user, relationship });
      } catch {
        // skip missing profiles
      }
    }
    return { items };
  }

  private async resolveRelationship(
    viewerId: string,
    targetUserId: string,
  ): Promise<GolfFriendRelationship> {
    const row = await this.findBetween(viewerId, targetUserId);
    if (!row) return GolfFriendRelationship.NONE;
    if (row.status === 'ACCEPTED') return GolfFriendRelationship.FRIENDS;
    if (row.requesterId === viewerId) return GolfFriendRelationship.REQUESTED;
    return GolfFriendRelationship.RECEIVED;
  }

  private async findBetween(a: string, b: string) {
    return this.prisma.userFriendship.findFirst({
      where: {
        OR: [
          { requesterId: a, addresseeId: b },
          { requesterId: b, addresseeId: a },
        ],
      },
    });
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err != null &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    );
  }
}
