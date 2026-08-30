import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  addCalendarDays,
  buildWeekStrip,
  DISCOVERY_JOIN_STATUSES,
  isValidOnSelectedDate,
  kstDayBoundsUtc,
  localDayKey,
  sundayOfWeek,
} from '@jjoin/domain';
import type { FacilityWeeklyJoinsResponse } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { JoinsService } from '../joins/joins.service';

@Injectable()
export class FacilityWeeklyJoinsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => JoinsService))
    private readonly joins: JoinsService,
  ) {}

  async weeklyJoins(
    golfFacilityId: string,
    userId: string,
    date?: string,
  ): Promise<FacilityWeeklyJoinsResponse> {
    const facility = await this.prisma.golfFacility.findUnique({
      where: { id: golfFacilityId },
      select: { id: true },
    });
    if (!facility) {
      throw new NotFoundException({
        code: 'GOLF_FACILITY_NOT_FOUND',
        message: '골프장을 찾을 수 없습니다.',
      });
    }

    const now = new Date();
    const selectedDate = this.resolveDateKey(date, now);
    const weekStart = sundayOfWeek(selectedDate);
    const weekEnd = addCalendarDays(weekStart, 6);
    const weekStrip = buildWeekStrip(weekStart, { now });

    const venue = await this.prisma.venue.findFirst({
      where: { golfFacilityId },
      select: { id: true },
    });
    if (!venue) {
      return {
        golfFacilityId,
        weekDays: weekStrip.map((d) => ({
          date: d.date,
          weekdayLabel: d.weekdayLabel,
          count: 0,
          isToday: d.isToday,
        })),
        selectedDate,
        joins: [],
      };
    }

    const { start: rangeStart } = kstDayBoundsUtc(weekStart);
    const { end: rangeEndExclusive } = kstDayBoundsUtc(weekEnd);

    const rows = await this.prisma.join.findMany({
      where: {
        venueId: venue.id,
        status: { in: [...DISCOVERY_JOIN_STATUSES] },
        startAt: { gte: rangeStart, lt: rangeEndExclusive },
        scheduledEndAt: { gt: now },
      },
      include: {
        venue: true,
        host: { include: { profile: true } },
        participants: {
          include: { user: { include: { profile: true } } },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    const counts = new Map<string, number>();
    for (const d of weekStrip) counts.set(d.date, 0);
    for (const join of rows) {
      const key = localDayKey(join.startAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const selectedJoins = rows.filter((join) =>
      isValidOnSelectedDate({
        status: join.status,
        startAt: join.startAt,
        scheduledEndAt: join.scheduledEndAt,
        now,
        dateKey: selectedDate,
      }),
    );

    return {
      golfFacilityId,
      weekDays: weekStrip.map((d) => ({
        date: d.date,
        weekdayLabel: d.weekdayLabel,
        count: counts.get(d.date) ?? 0,
        isToday: d.isToday,
      })),
      selectedDate,
      joins: selectedJoins.map((j) => this.joins.toListItemPublic(j, userId)),
    };
  }

  private resolveDateKey(raw: string | undefined, now: Date): string {
    if (raw == null || raw === '') return localDayKey(now);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new BadRequestException({
        code: 'INVALID_DATE',
        message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)',
      });
    }
    return raw;
  }
}
