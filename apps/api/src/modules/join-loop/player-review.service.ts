import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assertPlayerReviewRating,
  computePlayerReputation,
  evaluatePlayerReviewEligibility,
  normalizePlayerReviewComment,
  PLAYED_TOGETHER_ELIGIBLE_STATUS,
} from '@jjoin/domain';
import type {
  JoinReviewTargetDto,
  PlayerReputationDto,
  PlayerReviewDto,
  PlayerReviewPublicDto,
  UpsertPlayerReviewRequest,
} from '@jjoin/types';
import { upsertPlayerReviewSchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlayerReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getReputation(userId: string): Promise<PlayerReputationDto> {
    const rows = await this.prisma.playerReview.findMany({
      where: { revieweeUserId: userId, visibility: 'VISIBLE' },
      select: { rating: true },
    });
    const agg = computePlayerReputation(rows.map((r) => r.rating));
    return {
      averageRating: agg.averageRating,
      averageRatingDisplay: agg.averageRatingDisplay,
      reviewCount: agg.reviewCount,
    };
  }

  async getReputationBatch(
    userIds: string[],
  ): Promise<Map<string, PlayerReputationDto>> {
    const map = new Map<string, PlayerReputationDto>();
    const unique = [...new Set(userIds.filter(Boolean))];
    for (const id of unique) {
      map.set(id, { averageRating: null, averageRatingDisplay: null, reviewCount: 0 });
    }
    if (unique.length === 0) return map;

    const rows = await this.prisma.playerReview.groupBy({
      by: ['revieweeUserId'],
      where: { revieweeUserId: { in: unique }, visibility: 'VISIBLE' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    for (const row of rows) {
      const count = row._count._all;
      const avgRaw = row._avg.rating;
      if (count === 0 || avgRaw == null) continue;
      const averageRating = Math.round(avgRaw * 10) / 10;
      map.set(row.revieweeUserId, {
        averageRating,
        averageRatingDisplay: averageRating.toFixed(1),
        reviewCount: count,
      });
    }
    return map;
  }

  async listPublicReviews(revieweeUserId: string): Promise<PlayerReviewPublicDto[]> {
    const rows = await this.prisma.playerReview.findMany({
      where: {
        revieweeUserId,
        visibility: 'VISIBLE',
        comment: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, rating: true, comment: true, createdAt: true },
    });
    return rows
      .filter((r) => Boolean(r.comment?.trim()))
      .map((r) => ({
        reviewId: r.id,
        rating: r.rating,
        comment: r.comment!.trim(),
        createdAt: r.createdAt.toISOString(),
      }));
  }

  async listReviewTargets(joinId: string, reviewerUserId: string): Promise<JoinReviewTargetDto[]> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        participants: {
          include: {
            user: { include: { profile: { include: { avatarAsset: true } } } },
          },
        },
      },
    });
    if (!join) throw new NotFoundException('join_not_found');
    if (join.status !== 'COMPLETED') {
      throw new ForbiddenException('join_not_completed');
    }

    const me = join.participants.find((p) => p.userId === reviewerUserId);
    if (!me || me.participationStatus !== 'COMPLETED') {
      throw new ForbiddenException('reviewer_not_attended');
    }

    const myReviews = await this.prisma.playerReview.findMany({
      where: { joinId, reviewerUserId },
    });
    const byReviewee = new Map(myReviews.map((r) => [r.revieweeUserId, r]));

    return join.participants
      .filter(
        (p) =>
          p.userId !== reviewerUserId && p.participationStatus === 'COMPLETED',
      )
      .map((p) => {
        const existing = byReviewee.get(p.userId) ?? null;
        return {
          userId: p.userId,
          nickname: p.user.profile?.nickname ?? '사용자',
          avatarUrl: p.user.profile?.avatarAsset?.storageKey ?? null,
          myReview: existing
            ? {
                reviewId: existing.id,
                rating: existing.rating,
                comment: existing.comment,
              }
            : null,
        };
      });
  }

  async upsertReview(
    joinId: string,
    reviewerUserId: string,
    raw: UpsertPlayerReviewRequest,
  ): Promise<PlayerReviewDto> {
    const parsed = upsertPlayerReviewSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_player_review');
    }
    let rating: number;
    let comment: string | null;
    try {
      rating = assertPlayerReviewRating(parsed.data.rating);
      comment = normalizePlayerReviewComment(parsed.data.comment ?? null);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'invalid_player_review',
      );
    }

    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: { participants: true },
    });
    if (!join) throw new NotFoundException('join_not_found');

    const reviewer = join.participants.find((p) => p.userId === reviewerUserId);
    const reviewee = join.participants.find((p) => p.userId === parsed.data.revieweeUserId);
    const eligibility = evaluatePlayerReviewEligibility({
      reviewerUserId,
      revieweeUserId: parsed.data.revieweeUserId,
      joinStatus: join.status,
      reviewerParticipationStatus: reviewer?.participationStatus ?? 'UNKNOWN',
      revieweeParticipationStatus: reviewee?.participationStatus ?? 'UNKNOWN',
    });
    if (!eligibility.ok) {
      throw new ForbiddenException(eligibility.reason);
    }

    const row = await this.prisma.playerReview.upsert({
      where: {
        joinId_reviewerUserId_revieweeUserId: {
          joinId,
          reviewerUserId,
          revieweeUserId: parsed.data.revieweeUserId,
        },
      },
      create: {
        joinId,
        reviewerUserId,
        revieweeUserId: parsed.data.revieweeUserId,
        rating,
        comment,
        visibility: 'VISIBLE',
      },
      update: {
        rating,
        comment,
      },
    });

    return {
      reviewId: row.id,
      joinId: row.joinId,
      reviewerUserId: row.reviewerUserId,
      revieweeUserId: row.revieweeUserId,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async countPlayedTogether(viewerUserId: string, otherUserId: string): Promise<number> {
    if (viewerUserId === otherUserId) return 0;
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint | number }>>`
      SELECT COUNT(*)::int AS c
      FROM join_participants jp_me
      INNER JOIN joins j ON j.id = jp_me.join_id
      INNER JOIN join_participants jp_other
        ON jp_other.join_id = jp_me.join_id
       AND jp_other.user_id = ${otherUserId}::uuid
      WHERE jp_me.user_id = ${viewerUserId}::uuid
        AND j.status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
        AND jp_me.participation_status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
        AND jp_other.participation_status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
    `;
    return Number(rows[0]?.c ?? 0);
  }
}
