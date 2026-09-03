import { Injectable } from '@nestjs/common';
import {
  PLAYED_TOGETHER_ELIGIBLE_STATUS,
  RECOMMEND_REASON_LABEL_KO,
  computePlayerReputation,
  inferPreferredHours,
  isStrongRecommendationAlertSignal,
  rankRecommendations,
  type RecommendCandidate,
  type RecommendReasonCode,
  type RecommendUserContext,
} from '@jjoin/domain';
import {
  NotificationType as DomainNotificationType,
  type RecommendedJoinDto,
  type RecommendedJoinsResponse,
} from '@jjoin/types';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';

function startHourKst(instant: Date): number {
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    hour12: false,
  }).format(instant);
  const hour = Number(hourStr);
  if (!Number.isFinite(hour)) return 0;
  return hour === 24 ? 0 : hour;
}

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

function isRecommendationPushEnabled(): boolean {
  const raw = (process.env.JOIN_RECOMMENDATION_PUSH_ENABLED ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'on';
}

type HostReputation = {
  averageRating: number | null;
  averageRatingDisplay: string | null;
  reviewCount: number;
};

@Injectable()
export class JoinRecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationEventService,
  ) {}

  async listForUser(
    userId: string,
    opts?: {
      limit?: number;
      includeDebug?: boolean;
      lat?: number | null;
      lng?: number | null;
    },
  ): Promise<RecommendedJoinsResponse> {
    const limit = Math.min(20, Math.max(1, opts?.limit ?? 5));
    const now = new Date();
    const socialMode = (process.env.SOCIAL_AUTH_MODE ?? 'mock').trim().toLowerCase();
    const allowDebug =
      process.env.NODE_ENV !== 'production' ||
      socialMode === 'mock' ||
      socialMode === 'hybrid';
    const includeDebug = opts?.includeDebug === true && allowDebug;

    const [
      candidateJoins,
      follows,
      regionPrefs,
      pastCompleted,
      playedTogetherCounts,
      viewer,
    ] = await Promise.all([
      this.prisma.join.findMany({
        where: {
          status: { in: ['OPEN', 'CONFIRMED'] },
          startAt: { gt: now },
          OR: [{ recruitClosesAt: null }, { recruitClosesAt: { gt: now } }],
        },
        select: {
          id: true,
          status: true,
          startAt: true,
          recruitClosesAt: true,
          plannedPlayerCount: true,
          confirmedPlayerCount: true,
          targetMaleCount: true,
          targetFemaleCount: true,
          isUrgent: true,
          hostUserId: true,
          venueId: true,
          venue: {
            select: {
              name: true,
              latitude: true,
              longitude: true,
              golfFacilityId: true,
              golfFacility: {
                select: {
                  sido: true,
                  sigungu: true,
                  displayName: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
          participants: {
            where: {
              participationStatus: {
                in: ['APPROVED', 'CONFIRMED', 'COMPLETED'],
              },
            },
            select: {
              userId: true,
              user: { select: { profile: { select: { gender: true } } } },
            },
          },
        },
        orderBy: { startAt: 'asc' },
        take: 200,
      }),
      this.prisma.golfFacilityFollow.findMany({
        where: { userId },
        select: { golfFacilityId: true },
      }),
      this.prisma.userJoinRegionPreference.findMany({
        where: { userId },
        select: { sido: true, sigungu: true },
      }),
      this.prisma.joinParticipant.findMany({
        where: {
          userId,
          participationStatus: 'COMPLETED',
          join: { status: 'COMPLETED' },
        },
        select: {
          join: {
            select: {
              venueId: true,
              startAt: true,
            },
          },
        },
        orderBy: { join: { startAt: 'desc' } },
        take: 50,
      }),
      this.loadPlayedTogetherCounts(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { profile: { select: { gender: true } } },
      }),
    ]);

    const hostIds = [...new Set(candidateJoins.map((j) => j.hostUserId))];
    const reputationMap = await this.loadHostReputationBatch(hostIds);

    const venueVisitCounts = new Map<string, number>();
    for (const row of pastCompleted) {
      const id = row.join.venueId;
      venueVisitCounts.set(id, (venueVisitCounts.get(id) ?? 0) + 1);
    }

    const pastHours = pastCompleted.map((r) => startHourKst(r.join.startAt));
    const ctx: RecommendUserContext = {
      userId,
      followedFacilityIds: new Set(follows.map((f) => f.golfFacilityId)),
      pastAttendedVenueIds: new Set(pastCompleted.map((r) => r.join.venueId)),
      venueVisitCounts,
      preferredHours: inferPreferredHours(pastHours),
      regionPrefs: regionPrefs.map((r) => ({
        sido: r.sido,
        sigungu: r.sigungu,
      })),
      playedTogetherUserIds: new Set(playedTogetherCounts.keys()),
      playedTogetherCounts,
      viewerLatitude: opts?.lat ?? null,
      viewerLongitude: opts?.lng ?? null,
      viewerGender: viewer?.profile?.gender ?? null,
    };

    const candidates: RecommendCandidate[] = candidateJoins.map((j) => {
      const gf = j.venue.golfFacility;
      const lat =
        decimalToNumber(gf?.latitude) ?? decimalToNumber(j.venue.latitude);
      const lng =
        decimalToNumber(gf?.longitude) ?? decimalToNumber(j.venue.longitude);
      const rep = reputationMap.get(j.hostUserId);
      return {
        joinId: j.id,
        status: j.status,
        startAt: j.startAt,
        recruitClosesAt: j.recruitClosesAt,
        plannedPlayerCount: j.plannedPlayerCount,
        confirmedPlayerCount: j.confirmedPlayerCount,
        targetMaleCount: j.targetMaleCount,
        targetFemaleCount: j.targetFemaleCount,
        confirmedGenders: j.participants.map((p) => p.user.profile?.gender ?? null),
        isUrgent: j.isUrgent === true,
        hostUserId: j.hostUserId,
        venueId: j.venueId,
        golfFacilityId: j.venue.golfFacilityId,
        sido: gf?.sido ?? null,
        sigungu: gf?.sigungu ?? null,
        startHourKst: startHourKst(j.startAt),
        participantUserIds: j.participants.map((p) => p.userId),
        latitude: lat,
        longitude: lng,
        hostAverageRating: rep?.averageRating ?? null,
        hostReviewCount: rep?.reviewCount ?? 0,
      };
    });

    const ranked = rankRecommendations(candidates, ctx, { limit, now });
    const byId = new Map(candidateJoins.map((j) => [j.id, j]));

    const items: RecommendedJoinDto[] = ranked.map((r) => {
      const join = byId.get(r.joinId)!;
      const venueName =
        join.venue.golfFacility?.displayName ?? join.venue.name;
      const seatsLeft = Math.max(
        0,
        join.plannedPlayerCount - join.confirmedPlayerCount,
      );
      const reasons = r.reasons.map((code) => ({
        code,
        label: RECOMMEND_REASON_LABEL_KO[code],
      }));
      const rep = reputationMap.get(join.hostUserId);
      const dto: RecommendedJoinDto = {
        joinId: r.joinId,
        venueName,
        startAt: join.startAt.toISOString(),
        seatsLeft,
        isUrgent: join.isUrgent === true,
        reasonCode: r.reason,
        reasonLabel: RECOMMEND_REASON_LABEL_KO[r.reason],
        reasons,
        distanceMeters:
          r.distanceMeters != null ? Math.round(r.distanceMeters) : null,
        hostAverageRatingDisplay:
          (rep?.reviewCount ?? 0) > 0 ? (rep?.averageRatingDisplay ?? null) : null,
        hostReviewCount: rep?.reviewCount ?? 0,
      };
      if (includeDebug) {
        dto.debug = { score: r.score, signals: r.signals };
      }
      return dto;
    });

    if (isRecommendationPushEnabled()) {
      await this.maybeEnqueueStrongAlerts(userId, ranked, items);
    }

    return { items };
  }

  private async maybeEnqueueStrongAlerts(
    userId: string,
    ranked: Array<{ joinId: string; signals: RecommendReasonCode[] }>,
    items: RecommendedJoinDto[],
  ): Promise<void> {
    const byId = new Map(items.map((i) => [i.joinId, i]));
    for (const row of ranked.slice(0, 3)) {
      if (!isStrongRecommendationAlertSignal(row.signals)) continue;
      const item = byId.get(row.joinId);
      if (!item) continue;
      const eventKey = `join-recommendation:${userId}:${row.joinId}`;
      await this.notifications.enqueueSafe({
        userId,
        type: NotificationType.JOIN_RECOMMENDATION,
        title: '추천 조인',
        body: item.reasonLabel,
        data: {
          type: DomainNotificationType.JOIN_RECOMMENDATION,
          joinId: row.joinId,
        },
        eventKey,
      });
    }
  }

  private async loadHostReputationBatch(
    userIds: string[],
  ): Promise<Map<string, HostReputation>> {
    const map = new Map<string, HostReputation>();
    for (const id of userIds) {
      map.set(id, {
        averageRating: null,
        averageRatingDisplay: null,
        reviewCount: 0,
      });
    }
    if (userIds.length === 0) return map;

    const reviews = await this.prisma.playerReview.findMany({
      where: {
        revieweeUserId: { in: userIds },
        visibility: 'VISIBLE',
      },
      select: { revieweeUserId: true, rating: true },
    });
    const byHost = new Map<string, number[]>();
    for (const r of reviews) {
      const list = byHost.get(r.revieweeUserId) ?? [];
      list.push(r.rating);
      byHost.set(r.revieweeUserId, list);
    }
    for (const [id, ratings] of byHost) {
      const agg = computePlayerReputation(ratings);
      map.set(id, {
        averageRating: agg.averageRating,
        averageRatingDisplay: agg.averageRatingDisplay,
        reviewCount: agg.reviewCount,
      });
    }
    return map;
  }

  private async loadPlayedTogetherCounts(
    userId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ user_id: string; played_count: bigint | number }>
    >`
      WITH my_completed AS (
        SELECT jp.join_id
        FROM join_participants jp
        INNER JOIN joins j ON j.id = jp.join_id
        WHERE jp.user_id = ${userId}::uuid
          AND j.status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
          AND jp.participation_status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
      )
      SELECT jp.user_id, COUNT(*)::int AS played_count
      FROM join_participants jp
      INNER JOIN my_completed mc ON mc.join_id = jp.join_id
      WHERE jp.user_id <> ${userId}::uuid
        AND jp.participation_status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
      GROUP BY jp.user_id
      ORDER BY played_count DESC
      LIMIT 200
    `;
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.user_id, Number(row.played_count));
    }
    return map;
  }
}
