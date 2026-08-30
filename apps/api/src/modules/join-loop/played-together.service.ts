import { Injectable } from '@nestjs/common';
import {
  PLAYED_TOGETHER_ELIGIBLE_STATUS,
  computeAttendanceReliability,
} from '@jjoin/domain';
import type { PlayedTogetherPersonDto } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';

type PlayedRow = {
  user_id: string;
  played_count: bigint | number;
  last_played_at: Date;
  completed_count: bigint | number;
  no_show_count: bigint | number;
  nickname: string | null;
  avatar_url: string | null;
  region_label: string | null;
};

@Injectable()
export class PlayedTogetherService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Co-participants from COMPLETED joins only.
   * Single aggregation query — no N+1.
   */
  async listForUser(userId: string): Promise<PlayedTogetherPersonDto[]> {
    const rows = await this.prisma.$queryRaw<PlayedRow[]>`
      WITH my_completed AS (
        SELECT jp.join_id
        FROM join_participants jp
        INNER JOIN joins j ON j.id = jp.join_id
        WHERE jp.user_id = ${userId}::uuid
          AND j.status = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
          AND jp.participation_status = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
      ),
      co AS (
        SELECT
          jp.user_id,
          COUNT(*)::int AS played_count,
          MAX(j.scheduled_end_at) AS last_played_at
        FROM join_participants jp
        INNER JOIN joins j ON j.id = jp.join_id
        INNER JOIN my_completed mc ON mc.join_id = jp.join_id
        WHERE jp.user_id <> ${userId}::uuid
          AND jp.participation_status = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
        GROUP BY jp.user_id
      ),
      reliability AS (
        SELECT
          jp.user_id,
          COUNT(*) FILTER (WHERE jp.participation_status = 'COMPLETED')::int AS completed_count,
          COUNT(*) FILTER (WHERE jp.participation_status = 'NO_SHOW')::int AS no_show_count
        FROM join_participants jp
        WHERE jp.user_id IN (SELECT user_id FROM co)
        GROUP BY jp.user_id
      )
      SELECT
        co.user_id,
        co.played_count,
        co.last_played_at,
        COALESCE(r.completed_count, 0) AS completed_count,
        COALESCE(r.no_show_count, 0) AS no_show_count,
        up.nickname,
        up.region_label,
        ma.storage_key AS avatar_url
      FROM co
      LEFT JOIN reliability r ON r.user_id = co.user_id
      LEFT JOIN user_profiles up ON up.user_id = co.user_id
      LEFT JOIN media_assets ma ON ma.id = up.avatar_asset_id
      ORDER BY co.last_played_at DESC, co.played_count DESC
      LIMIT 100
    `;

    return rows.map((row) => {
      const completedCount = Number(row.completed_count);
      const noShowCount = Number(row.no_show_count);
      const reliability = computeAttendanceReliability({
        completedCount,
        noShowCount,
      });
      return {
        userId: row.user_id,
        nickname: row.nickname ?? '사용자',
        verifiedBadge: true,
        avatarUrl: row.avatar_url,
        regionLabel: row.region_label,
        playedCount: Number(row.played_count),
        lastPlayedAt: new Date(row.last_played_at).toISOString(),
        completedJoinCount: completedCount,
        noShowCount,
        attendanceRatePercent: reliability.attendanceRatePercent,
      };
    });
  }
}
