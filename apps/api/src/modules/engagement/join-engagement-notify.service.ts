import { Injectable, Logger } from '@nestjs/common';
import {
  bookmarkNotificationEventKey,
  isJoinCapacityJoinable,
  matchesJoinAlertSubscription,
  newJoinableNotificationEventKey,
} from '@jjoin/domain';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';

export type BookmarkJoinNotifyKind = 'closing' | 'spot_left' | 'updated' | 'cancelled';

const BOOKMARK_TYPE: Record<BookmarkJoinNotifyKind, NotificationType> = {
  closing: NotificationType.BOOKMARK_JOIN_CLOSING,
  spot_left: NotificationType.BOOKMARK_JOIN_SPOT_LEFT,
  updated: NotificationType.BOOKMARK_JOIN_UPDATED,
  cancelled: NotificationType.BOOKMARK_JOIN_CANCELLED,
};

const BOOKMARK_COPY: Record<BookmarkJoinNotifyKind, { title: string; body: string }> = {
  closing: {
    title: '관심 조인 마감 임박',
    body: '북마크한 조인의 모집이 곧 마감됩니다.',
  },
  spot_left: {
    title: '관심 조인 자리 남음',
    body: '북마크한 조인에 자리가 남았습니다.',
  },
  updated: {
    title: '관심 조인 변경',
    body: '북마크한 조인 정보가 변경되었습니다.',
  },
  cancelled: {
    title: '관심 조인 취소',
    body: '북마크한 조인이 취소되었습니다.',
  },
};

/**
 * Fire-and-forget engagement notifications after business commit.
 * Shared eventKey dedupes alert-match and followed-store for the same user+join.
 */
@Injectable()
export class JoinEngagementNotifyService {
  private readonly logger = new Logger(JoinEngagementNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationEventService,
  ) {}

  async notifyNewJoinableJoin(joinId: string): Promise<void> {
    try {
      await this.notifyNewJoinableJoinInner(joinId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'notify_new_joinable_failed';
      this.logger.warn(`notifyNewJoinableJoin failed joinId=${joinId} err=${msg}`);
    }
  }

  async notifyBookmarkJoinEvent(joinId: string, kind: BookmarkJoinNotifyKind): Promise<void> {
    try {
      await this.notifyBookmarkJoinEventInner(joinId, kind);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'notify_bookmark_failed';
      this.logger.warn(`notifyBookmarkJoinEvent failed joinId=${joinId} kind=${kind} err=${msg}`);
    }
  }

  private async notifyNewJoinableJoinInner(joinId: string): Promise<void> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        venue: {
          include: {
            golfFacility: { select: { id: true, sido: true, sigungu: true, displayName: true } },
          },
        },
      },
    });
    if (!join) return;

    const joinable = isJoinCapacityJoinable({
      status: join.status,
      currentParticipants: join.confirmedPlayerCount,
      maxParticipants: join.plannedPlayerCount,
    });
    if (!joinable) return;

    const sido = join.venue.golfFacility?.sido ?? null;
    const sigungu = join.venue.golfFacility?.sigungu ?? null;
    const venueName = join.venue.name;
    const facilityId = join.venue.golfFacilityId;

    const candidate = {
      startAt: join.startAt,
      status: join.status,
      currentParticipants: join.confirmedPlayerCount,
      maxParticipants: join.plannedPlayerCount,
      sido,
      sigungu,
    };

    const now = new Date();
    const recipients = new Map<string, NotificationType>();

    const subscriptions = await this.prisma.joinAlertSubscription.findMany({
      where: { enabled: true },
    });
    for (const sub of subscriptions) {
      const matched = matchesJoinAlertSubscription(
        {
          dateMode: sub.dateMode,
          specificDate: sub.specificDate
            ? sub.specificDate.toISOString().slice(0, 10)
            : null,
          timeBand: sub.timeBand,
          joinableOnly: sub.joinableOnly,
          sido: sub.sido,
          sigungu: sub.sigungu,
        },
        candidate,
        now,
      );
      if (!matched) continue;
      if (sub.userId === join.hostUserId) continue;
      if (!recipients.has(sub.userId)) {
        recipients.set(sub.userId, NotificationType.JOIN_ALERT_MATCH);
      }
    }

    if (facilityId) {
      const followers = await this.prisma.golfFacilityFollow.findMany({
        where: { golfFacilityId: facilityId },
        select: { userId: true },
      });
      for (const f of followers) {
        if (f.userId === join.hostUserId) continue;
        if (!recipients.has(f.userId)) {
          recipients.set(f.userId, NotificationType.FOLLOWED_STORE_NEW_JOIN);
        }
      }
    }

    const facilityLabel = join.venue.golfFacility?.displayName ?? venueName;

    for (const [userId, type] of recipients) {
      const isAlert = type === NotificationType.JOIN_ALERT_MATCH;
      await this.notifications.enqueueSafe({
        userId,
        type,
        title: isAlert ? '조건에 맞는 조인' : '관심 매장 새 조인',
        body: isAlert
          ? `${venueName}에 참가 가능한 조인이 열렸습니다.`
          : `${facilityLabel}에 새 조인이 등록되었습니다.`,
        data: {
          type,
          joinId: join.id,
          venueName,
          golfFacilityId: facilityId,
        },
        eventKey: newJoinableNotificationEventKey(userId, join.id),
      });
    }
  }

  private async notifyBookmarkJoinEventInner(
    joinId: string,
    kind: BookmarkJoinNotifyKind,
  ): Promise<void> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      select: { id: true, venue: { select: { name: true } } },
    });
    if (!join) return;

    const bookmarks = await this.prisma.joinBookmark.findMany({
      where: { joinId },
      select: { userId: true },
    });
    if (bookmarks.length === 0) return;

    const copy = BOOKMARK_COPY[kind];
    const type = BOOKMARK_TYPE[kind];
    const venueName = join.venue.name;

    for (const b of bookmarks) {
      await this.notifications.enqueueSafe({
        userId: b.userId,
        type,
        title: copy.title,
        body: `${venueName} — ${copy.body}`,
        data: { type, joinId: join.id, kind },
        eventKey: bookmarkNotificationEventKey(b.userId, join.id, kind),
      });
    }
  }
}
