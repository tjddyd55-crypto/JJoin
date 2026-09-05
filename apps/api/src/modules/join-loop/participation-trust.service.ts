import { Injectable } from '@nestjs/common';
import { calculateParticipationTrust, PLAYED_TOGETHER_ELIGIBLE_STATUS } from '@jjoin/domain';
import type { ParticipationTrustDto } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ParticipationTrustService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Objective participation trust SSOT.
   * attendanceRate denominator = attended + noShow (pre-game cancel excluded).
   */
  async getTrust(userId: string): Promise<ParticipationTrustDto> {
    const [attendedCount, noShowCount, cancelledCount, playedTogetherCount] = await Promise.all([
      this.prisma.joinParticipant.count({
        where: { userId, participationStatus: 'COMPLETED' },
      }),
      this.prisma.joinParticipant.count({
        where: { userId, participationStatus: 'NO_SHOW' },
      }),
      this.prisma.joinParticipant.count({
        where: { userId, participationStatus: 'CANCELLED' },
      }),
      this.countPlayedTogetherDistinct(userId),
    ]);

    const participationCount = attendedCount + noShowCount + cancelledCount;
    const trust = calculateParticipationTrust({
      joinedCount: participationCount,
      attendedCount,
      noShowCount,
      cancelledCount,
      playedTogetherCount,
    });

    return {
      participationCount,
      attendedCount,
      noShowCount,
      cancelledCount,
      attendanceRate: trust.attendanceRate,
      attendanceRatePercent: trust.attendanceRatePercent,
      playedTogetherCount,
      trustLabel: trust.labelText,
      trustLabelId: trust.label,
    };
  }

  private async countPlayedTogetherDistinct(userId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ c: bigint | number }>>`
      SELECT COUNT(DISTINCT jp_other.user_id)::int AS c
      FROM join_participants jp_me
      INNER JOIN joins j ON j.id = jp_me.join_id
      INNER JOIN join_participants jp_other
        ON jp_other.join_id = jp_me.join_id
       AND jp_other.user_id <> ${userId}::uuid
      WHERE jp_me.user_id = ${userId}::uuid
        AND j.status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
        AND jp_me.participation_status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
        AND jp_other.participation_status::text = ${PLAYED_TOGETHER_ELIGIBLE_STATUS}
    `;
    return Number(rows[0]?.c ?? 0);
  }
}
