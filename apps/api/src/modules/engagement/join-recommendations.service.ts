import { Injectable } from '@nestjs/common';
import {
  PLAYED_TOGETHER_ELIGIBLE_STATUS,
  RECOMMEND_REASON_LABEL_KO,
  inferPreferredHours,
  rankRecommendations,
  type RecommendCandidate,
  type RecommendUserContext,
} from '@jjoin/domain';
import type { RecommendedJoinDto, RecommendedJoinsResponse } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';

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

@Injectable()
export class JoinRecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(
    userId: string,
    opts?: { limit?: number; includeDebug?: boolean },
  ): Promise<RecommendedJoinsResponse> {
    const limit = Math.min(20, Math.max(1, opts?.limit ?? 5));
    const now = new Date();
    // Railway Development often sets NODE_ENV=production; allow debug when mock/hybrid auth.
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
      playedTogetherIds,
    ] = await Promise.all([
      this.prisma.join.findMany({
        where: {
          status: { in: ['OPEN', 'CONFIRMED'] },
          startAt: { gt: now },
        },
        select: {
          id: true,
          status: true,
          startAt: true,
          plannedPlayerCount: true,
          confirmedPlayerCount: true,
          isUrgent: true,
          hostUserId: true,
          venueId: true,
          venue: {
            select: {
              name: true,
              golfFacilityId: true,
              golfFacility: {
                select: { sido: true, sigungu: true, displayName: true },
              },
            },
          },
          participants: {
            where: {
              participationStatus: {
                in: ['APPROVED', 'CONFIRMED', 'COMPLETED'],
              },
            },
            select: { userId: true },
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
        take: 200,
      }),
      this.loadPlayedTogetherUserIds(userId),
    ]);

    const pastHours = pastCompleted.map((r) => startHourKst(r.join.startAt));
    const ctx: RecommendUserContext = {
      userId,
      followedFacilityIds: new Set(follows.map((f) => f.golfFacilityId)),
      pastAttendedVenueIds: new Set(pastCompleted.map((r) => r.join.venueId)),
      preferredHours: inferPreferredHours(pastHours),
      regionPrefs: regionPrefs.map((r) => ({
        sido: r.sido,
        sigungu: r.sigungu,
      })),
      playedTogetherUserIds: playedTogetherIds,
    };

    const candidates: RecommendCandidate[] = candidateJoins.map((j) => {
      const gf = j.venue.golfFacility;
      return {
        joinId: j.id,
        status: j.status,
        startAt: j.startAt,
        plannedPlayerCount: j.plannedPlayerCount,
        confirmedPlayerCount: j.confirmedPlayerCount,
        isUrgent: j.isUrgent === true,
        hostUserId: j.hostUserId,
        venueId: j.venueId,
        golfFacilityId: j.venue.golfFacilityId,
        sido: gf?.sido ?? null,
        sigungu: gf?.sigungu ?? null,
        startHourKst: startHourKst(j.startAt),
        participantUserIds: j.participants.map((p) => p.userId),
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
      const dto: RecommendedJoinDto = {
        joinId: r.joinId,
        venueName,
        startAt: join.startAt.toISOString(),
        seatsLeft,
        isUrgent: join.isUrgent === true,
        reasonCode: r.reason,
        reasonLabel: RECOMMEND_REASON_LABEL_KO[r.reason],
      };
      if (includeDebug) {
        dto.debug = { score: r.score, signals: r.signals };
      }
      return dto;
    });

    return { items };
  }

  private async loadPlayedTogetherUserIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.$queryRaw<Array<{ user_id: string }>>`
      WITH my_completed AS (
        SELECT jp.join_id
        FROM join_participants jp
        INNER JOIN joins j ON j.id = jp.join_id
        WHERE jp.user_id = ${userId}::uuid
          AND j.status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
          AND jp.participation_status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
      )
      SELECT DISTINCT jp.user_id
      FROM join_participants jp
      INNER JOIN my_completed mc ON mc.join_id = jp.join_id
      WHERE jp.user_id <> ${userId}::uuid
        AND jp.participation_status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
      LIMIT 200
    `;
    return new Set(rows.map((r) => r.user_id));
  }
}
