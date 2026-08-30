import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  addCalendarDays,
  isJoinCapacityJoinable,
  localDayKey,
  sundayOfWeek,
} from '@jjoin/domain';
import type { GolfFacilityFollowDto } from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FacilityFollowsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<GolfFacilityFollowDto[]> {
    const rows = await this.prisma.golfFacilityFollow.findMany({
      where: { userId },
      include: {
        golfFacility: {
          select: {
            id: true,
            displayName: true,
            sido: true,
            sigungu: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (rows.length === 0) return [];

    const counts = await this.joinableCountsByFacilityIds(
      rows.map((r) => r.golfFacilityId),
    );

    return rows.map((row) => {
      const c = counts.get(row.golfFacilityId) ?? {
        todayJoinableCount: 0,
        weekJoinableCount: 0,
      };
      return {
        id: row.id,
        golfFacilityId: row.golfFacilityId,
        createdAt: row.createdAt.toISOString(),
        displayName: row.golfFacility.displayName,
        sido: row.golfFacility.sido,
        sigungu: row.golfFacility.sigungu,
        todayJoinableCount: c.todayJoinableCount,
        weekJoinableCount: c.weekJoinableCount,
      };
    });
  }

  async follow(userId: string, golfFacilityId: string): Promise<GolfFacilityFollowDto> {
    const facility = await this.prisma.golfFacility.findUnique({
      where: { id: golfFacilityId },
      select: { id: true, displayName: true, sido: true, sigungu: true },
    });
    if (!facility) {
      throw new NotFoundException({
        code: 'GOLF_FACILITY_NOT_FOUND',
        message: '골프장을 찾을 수 없습니다.',
      });
    }

    try {
      const row = await this.prisma.golfFacilityFollow.create({
        data: { userId, golfFacilityId },
      });
      const counts = await this.joinableCountsByFacilityIds([golfFacilityId]);
      const c = counts.get(golfFacilityId) ?? {
        todayJoinableCount: 0,
        weekJoinableCount: 0,
      };
      return {
        id: row.id,
        golfFacilityId: row.golfFacilityId,
        createdAt: row.createdAt.toISOString(),
        displayName: facility.displayName,
        sido: facility.sido,
        sigungu: facility.sigungu,
        todayJoinableCount: c.todayJoinableCount,
        weekJoinableCount: c.weekJoinableCount,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          code: 'FACILITY_ALREADY_FOLLOWED',
          message: '이미 팔로우한 매장입니다.',
        });
      }
      throw e;
    }
  }

  async unfollow(userId: string, golfFacilityId: string): Promise<{ ok: true }> {
    const existing = await this.prisma.golfFacilityFollow.findUnique({
      where: { userId_golfFacilityId: { userId, golfFacilityId } },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'FACILITY_FOLLOW_NOT_FOUND',
        message: '팔로우가 없습니다.',
      });
    }
    await this.prisma.golfFacilityFollow.delete({ where: { id: existing.id } });
    return { ok: true };
  }

  private async joinableCountsByFacilityIds(
    golfFacilityIds: string[],
  ): Promise<Map<string, { todayJoinableCount: number; weekJoinableCount: number }>> {
    const result = new Map<string, { todayJoinableCount: number; weekJoinableCount: number }>();
    for (const id of golfFacilityIds) {
      result.set(id, { todayJoinableCount: 0, weekJoinableCount: 0 });
    }
    if (golfFacilityIds.length === 0) return result;

    const venues = await this.prisma.venue.findMany({
      where: { golfFacilityId: { in: golfFacilityIds } },
      select: { id: true, golfFacilityId: true },
    });
    if (venues.length === 0) return result;

    const venueToFacility = new Map<string, string>();
    for (const v of venues) {
      if (v.golfFacilityId) venueToFacility.set(v.id, v.golfFacilityId);
    }

    const now = new Date();
    const todayKey = localDayKey(now);
    const weekStart = sundayOfWeek(todayKey);
    const weekEnd = addCalendarDays(weekStart, 6);

    const joins = await this.prisma.join.findMany({
      where: {
        venueId: { in: [...venueToFacility.keys()] },
        status: { in: ['OPEN', 'CONFIRMED', 'IN_PROGRESS', 'FULL'] },
        scheduledEndAt: { gt: now },
      },
      select: {
        venueId: true,
        status: true,
        startAt: true,
        confirmedPlayerCount: true,
        plannedPlayerCount: true,
      },
    });

    for (const join of joins) {
      const facilityId = venueToFacility.get(join.venueId);
      if (!facilityId) continue;
      const joinable = isJoinCapacityJoinable({
        status: join.status,
        currentParticipants: join.confirmedPlayerCount,
        maxParticipants: join.plannedPlayerCount,
      });
      if (!joinable) continue;

      const dayKey = localDayKey(join.startAt);
      const bucket = result.get(facilityId)!;
      if (dayKey === todayKey) bucket.todayJoinableCount += 1;
      if (dayKey >= weekStart && dayKey <= weekEnd) bucket.weekJoinableCount += 1;
    }

    return result;
  }
}
