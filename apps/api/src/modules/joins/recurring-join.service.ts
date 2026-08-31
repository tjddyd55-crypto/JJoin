import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  RECURRING_AHEAD_WEEKS,
  defaultRecruitClosesAt,
  listUpcomingWeeklyStarts,
  nextWeeklyOccurrenceStart,
  occurrenceDateKeyFromStart,
  parseLocalHm,
  type IsoWeekday,
} from '@jjoin/domain';
import type {
  CreateRecurringJoinScheduleRequest,
  CreateStoreMatchingJoinRequest,
  RecurringJoinRunSummary,
  RecurringJoinScheduleDto,
  SkipRecurringJoinOccurrenceRequest,
  UpdateRecurringJoinScheduleRequest,
} from '@jjoin/types';
import {
  createRecurringJoinScheduleSchema,
  skipRecurringJoinOccurrenceSchema,
  updateRecurringJoinScheduleSchema,
} from '@jjoin/validation';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchingJoinsService } from './matching-joins.service';

function dateKeyToPrismaDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function prismaDateToKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function asIsoWeekday(n: number): IsoWeekday {
  if (n < 1 || n > 7) throw new BadRequestException('invalid_day_of_week');
  return n as IsoWeekday;
}

@Injectable()
export class RecurringJoinService {
  private readonly logger = new Logger(RecurringJoinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingJoins: MatchingJoinsService,
  ) {}

  async listMine(ownerUserId: string): Promise<RecurringJoinScheduleDto[]> {
    const rows = await this.prisma.recurringJoinSchedule.findMany({
      where: {
        ownerUserId,
        status: { not: 'DELETED' },
      },
      include: { golfFacility: { select: { displayName: true } } },
      orderBy: [{ status: 'asc' }, { nextRunAt: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(
    ownerUserId: string,
    raw: CreateRecurringJoinScheduleRequest,
  ): Promise<RecurringJoinScheduleDto> {
    const parsed = createRecurringJoinScheduleSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_recurring_join_schedule');
    }
    const input = parsed.data;
    try {
      parseLocalHm(input.startTimeLocal);
    } catch {
      throw new BadRequestException('invalid_start_time');
    }

    const ownership = await this.prisma.storeOwnership.findFirst({
      where: {
        id: input.storeOwnershipId,
        userId: ownerUserId,
        status: 'ACTIVE',
      },
      include: { golfFacility: { select: { displayName: true } } },
    });
    if (!ownership) {
      throw new ForbiddenException({
        code: 'STORE_OWNERSHIP_REQUIRED',
        message: '활성 매장 소유권이 필요합니다.',
      });
    }

    const dayOfWeek = asIsoWeekday(input.dayOfWeek);
    const now = new Date();
    const nextRunAt = nextWeeklyOccurrenceStart({
      dayOfWeek,
      startTimeLocal: input.startTimeLocal,
      after: now,
    });

    const row = await this.prisma.recurringJoinSchedule.create({
      data: {
        ownerUserId,
        storeOwnershipId: ownership.id,
        golfFacilityId: ownership.golfFacilityId,
        cadence: 'WEEKLY',
        dayOfWeek,
        startTimeLocal: this.normalizeHm(input.startTimeLocal),
        timezone: 'Asia/Seoul',
        targetMaleCount: input.targetMaleCount,
        targetFemaleCount: input.targetFemaleCount,
        minimumPlayers: input.minimumPlayers,
        matchingRewardTarget: input.matchingRewardTarget,
        rewardPerParticipant: new Prisma.Decimal(input.rewardPerParticipant),
        title: input.title ?? null,
        description: input.description ?? null,
        recruitClosesHoursBefore: input.recruitClosesHoursBefore ?? 3,
        status: 'ACTIVE',
        nextRunAt,
      },
      include: { golfFacility: { select: { displayName: true } } },
    });
    return this.toDto(row);
  }

  async update(
    ownerUserId: string,
    scheduleId: string,
    raw: UpdateRecurringJoinScheduleRequest,
  ): Promise<RecurringJoinScheduleDto> {
    const parsed = updateRecurringJoinScheduleSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_recurring_join_schedule_update');
    }
    const input = parsed.data;
    const schedule = await this.requireOwnerSchedule(ownerUserId, scheduleId);
    if (schedule.status === 'DELETED') {
      throw new NotFoundException('recurring_schedule_not_found');
    }

    const dayOfWeek = input.dayOfWeek ?? schedule.dayOfWeek;
    const startTimeLocal = input.startTimeLocal
      ? this.normalizeHm(input.startTimeLocal)
      : schedule.startTimeLocal;
    try {
      parseLocalHm(startTimeLocal);
    } catch {
      throw new BadRequestException('invalid_start_time');
    }

    const male = input.targetMaleCount ?? schedule.targetMaleCount;
    const female = input.targetFemaleCount ?? schedule.targetFemaleCount;
    const minimum = input.minimumPlayers ?? schedule.minimumPlayers;
    if (male + female < 1 || male + female > 4) {
      throw new BadRequestException('matching_roster_invalid');
    }
    if (minimum > male + female) {
      throw new BadRequestException('minimum_exceeds_planned');
    }

    const nextRunAt = nextWeeklyOccurrenceStart({
      dayOfWeek: asIsoWeekday(dayOfWeek),
      startTimeLocal,
      after: new Date(),
    });

    const row = await this.prisma.recurringJoinSchedule.update({
      where: { id: scheduleId },
      data: {
        dayOfWeek,
        startTimeLocal,
        targetMaleCount: male,
        targetFemaleCount: female,
        minimumPlayers: minimum,
        ...(input.matchingRewardTarget
          ? { matchingRewardTarget: input.matchingRewardTarget }
          : {}),
        ...(input.rewardPerParticipant !== undefined
          ? {
              rewardPerParticipant: new Prisma.Decimal(input.rewardPerParticipant),
            }
          : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.recruitClosesHoursBefore !== undefined
          ? { recruitClosesHoursBefore: input.recruitClosesHoursBefore }
          : {}),
        nextRunAt,
        lastError: null,
      },
      include: { golfFacility: { select: { displayName: true } } },
    });
    return this.toDto(row);
  }

  async pause(ownerUserId: string, scheduleId: string): Promise<RecurringJoinScheduleDto> {
    const schedule = await this.requireOwnerSchedule(ownerUserId, scheduleId);
    if (schedule.status === 'DELETED') {
      throw new NotFoundException('recurring_schedule_not_found');
    }
    const row = await this.prisma.recurringJoinSchedule.update({
      where: { id: scheduleId },
      data: { status: 'PAUSED', nextRunAt: null },
      include: { golfFacility: { select: { displayName: true } } },
    });
    return this.toDto(row);
  }

  async resume(ownerUserId: string, scheduleId: string): Promise<RecurringJoinScheduleDto> {
    const schedule = await this.requireOwnerSchedule(ownerUserId, scheduleId);
    if (schedule.status === 'DELETED') {
      throw new NotFoundException('recurring_schedule_not_found');
    }
    const nextRunAt = nextWeeklyOccurrenceStart({
      dayOfWeek: asIsoWeekday(schedule.dayOfWeek),
      startTimeLocal: schedule.startTimeLocal,
      after: new Date(),
    });
    const row = await this.prisma.recurringJoinSchedule.update({
      where: { id: scheduleId },
      data: { status: 'ACTIVE', nextRunAt, lastError: null },
      include: { golfFacility: { select: { displayName: true } } },
    });
    return this.toDto(row);
  }

  async softDelete(ownerUserId: string, scheduleId: string): Promise<RecurringJoinScheduleDto> {
    await this.requireOwnerSchedule(ownerUserId, scheduleId);
    const row = await this.prisma.recurringJoinSchedule.update({
      where: { id: scheduleId },
      data: { status: 'DELETED', nextRunAt: null },
      include: { golfFacility: { select: { displayName: true } } },
    });
    return this.toDto(row);
  }

  async skipOccurrence(
    ownerUserId: string,
    scheduleId: string,
    raw: SkipRecurringJoinOccurrenceRequest,
  ): Promise<{ scheduleId: string; occurrenceDate: string }> {
    const parsed = skipRecurringJoinOccurrenceSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_skip_occurrence');
    }
    await this.requireOwnerSchedule(ownerUserId, scheduleId);
    const occurrenceDate = dateKeyToPrismaDate(parsed.data.occurrenceDate);

    await this.prisma.recurringJoinSkip.upsert({
      where: {
        scheduleId_occurrenceDate: { scheduleId, occurrenceDate },
      },
      create: { scheduleId, occurrenceDate },
      update: {},
    });
    await this.prisma.recurringJoinOccurrence.upsert({
      where: {
        scheduleId_occurrenceDate: { scheduleId, occurrenceDate },
      },
      create: {
        scheduleId,
        occurrenceDate,
        status: 'SKIPPED',
      },
      update: { status: 'SKIPPED', joinId: null, errorMessage: null },
    });

    return { scheduleId, occurrenceDate: parsed.data.occurrenceDate };
  }

  /**
   * Cron: materialize upcoming occurrences for ACTIVE schedules.
   * Failures are recorded per occurrence; other schedules continue.
   */
  async runDueSchedules(): Promise<RecurringJoinRunSummary> {
    const summary: RecurringJoinRunSummary = {
      scanned: 0,
      created: 0,
      skipped: 0,
      failed: 0,
    };
    const now = new Date();
    const schedules = await this.prisma.recurringJoinSchedule.findMany({
      where: { status: 'ACTIVE' },
      include: { golfFacility: { select: { displayName: true } } },
    });
    summary.scanned = schedules.length;
    if (schedules.length === 0) return summary;

    const scheduleIds = schedules.map((s) => s.id);
    const plannedBySchedule = new Map<
      string,
      Array<{ startAt: Date; dateKey: string }>
    >();
    const allDateKeys = new Set<string>();

    for (const schedule of schedules) {
      const starts = listUpcomingWeeklyStarts({
        dayOfWeek: asIsoWeekday(schedule.dayOfWeek),
        startTimeLocal: schedule.startTimeLocal,
        from: now,
        aheadWeeks: RECURRING_AHEAD_WEEKS,
      });
      const planned = starts.map((startAt) => ({
        startAt,
        dateKey: occurrenceDateKeyFromStart(startAt),
      }));
      plannedBySchedule.set(schedule.id, planned);
      for (const p of planned) allDateKeys.add(p.dateKey);
    }

    const dateList = [...allDateKeys].map(dateKeyToPrismaDate);
    const [skips, existingJoins] = await Promise.all([
      this.prisma.recurringJoinSkip.findMany({
        where: {
          scheduleId: { in: scheduleIds },
          occurrenceDate: { in: dateList },
        },
        select: { scheduleId: true, occurrenceDate: true },
      }),
      this.prisma.join.findMany({
        where: {
          recurringScheduleId: { in: scheduleIds },
          recurringOccurrenceDate: { in: dateList },
        },
        select: {
          id: true,
          recurringScheduleId: true,
          recurringOccurrenceDate: true,
        },
      }),
    ]);

    const skipKeys = new Set(
      skips.map((s) => `${s.scheduleId}:${prismaDateToKey(s.occurrenceDate)}`),
    );
    const existingKeys = new Set(
      existingJoins
        .filter((j) => j.recurringScheduleId && j.recurringOccurrenceDate)
        .map(
          (j) =>
            `${j.recurringScheduleId}:${prismaDateToKey(j.recurringOccurrenceDate!)}`,
        ),
    );

    for (const schedule of schedules) {
      const planned = plannedBySchedule.get(schedule.id) ?? [];
      let lastCreatedStart: Date | null = null;
      let lastError: string | null = null;

      for (const item of planned) {
        const key = `${schedule.id}:${item.dateKey}`;
        if (skipKeys.has(key)) {
          summary.skipped += 1;
          continue;
        }
        if (existingKeys.has(key)) {
          summary.skipped += 1;
          continue;
        }

        const recruitClosesAt = defaultRecruitClosesAt(
          item.startAt,
          schedule.recruitClosesHoursBefore,
        );
        if (recruitClosesAt.getTime() <= now.getTime()) {
          summary.skipped += 1;
          continue;
        }

        const createBody: CreateStoreMatchingJoinRequest = {
          storeOwnershipId: schedule.storeOwnershipId,
          startAt: item.startAt.toISOString(),
          recruitClosesAt: recruitClosesAt.toISOString(),
          targetMaleCount: schedule.targetMaleCount,
          targetFemaleCount: schedule.targetFemaleCount,
          minimumPlayers: schedule.minimumPlayers,
          matchingRewardTarget: schedule.matchingRewardTarget as CreateStoreMatchingJoinRequest['matchingRewardTarget'],
          rewardPerParticipant: String(schedule.rewardPerParticipant),
          title: schedule.title,
          description: schedule.description,
          idempotencyKey: `recurring:${schedule.id}:${item.dateKey}`,
          recurringScheduleId: schedule.id,
          recurringOccurrenceDate: item.dateKey,
        };

        try {
          const detail = await this.matchingJoins.create(
            schedule.ownerUserId,
            createBody,
          );
          existingKeys.add(key);
          lastCreatedStart = item.startAt;
          summary.created += 1;

          await this.prisma.recurringJoinOccurrence.upsert({
            where: {
              scheduleId_occurrenceDate: {
                scheduleId: schedule.id,
                occurrenceDate: dateKeyToPrismaDate(item.dateKey),
              },
            },
            create: {
              scheduleId: schedule.id,
              occurrenceDate: dateKeyToPrismaDate(item.dateKey),
              joinId: detail.joinId,
              status: 'CREATED',
            },
            update: {
              joinId: detail.joinId,
              status: 'CREATED',
              errorMessage: null,
            },
          });
        } catch (e) {
          const message =
            e instanceof Error ? e.message.slice(0, 400) : 'create_failed';
          lastError = message;
          summary.failed += 1;
          this.logger.warn(
            `recurring create failed schedule=${schedule.id} date=${item.dateKey}: ${message}`,
          );
          await this.prisma.recurringJoinOccurrence.upsert({
            where: {
              scheduleId_occurrenceDate: {
                scheduleId: schedule.id,
                occurrenceDate: dateKeyToPrismaDate(item.dateKey),
              },
            },
            create: {
              scheduleId: schedule.id,
              occurrenceDate: dateKeyToPrismaDate(item.dateKey),
              status: 'FAILED',
              errorMessage: message,
            },
            update: {
              status: 'FAILED',
              errorMessage: message,
            },
          });
        }
      }

      const nextRunAt = nextWeeklyOccurrenceStart({
        dayOfWeek: asIsoWeekday(schedule.dayOfWeek),
        startTimeLocal: schedule.startTimeLocal,
        after: now,
      });
      await this.prisma.recurringJoinSchedule.update({
        where: { id: schedule.id },
        data: {
          nextRunAt,
          ...(lastCreatedStart ? { lastRunAt: lastCreatedStart } : {}),
          lastError,
        },
      });
    }

    return summary;
  }

  private async requireOwnerSchedule(ownerUserId: string, scheduleId: string) {
    const schedule = await this.prisma.recurringJoinSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule || schedule.ownerUserId !== ownerUserId) {
      throw new NotFoundException('recurring_schedule_not_found');
    }
    return schedule;
  }

  private normalizeHm(hm: string): string {
    const { hour, minute } = parseLocalHm(hm);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  private toDto(row: {
    id: string;
    storeOwnershipId: string;
    golfFacilityId: string;
    cadence: string;
    dayOfWeek: number;
    startTimeLocal: string;
    timezone: string;
    targetMaleCount: number;
    targetFemaleCount: number;
    minimumPlayers: number;
    matchingRewardTarget: string;
    rewardPerParticipant: Prisma.Decimal | string;
    title: string | null;
    description: string | null;
    recruitClosesHoursBefore: number;
    status: string;
    nextRunAt: Date | null;
    lastRunAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
    golfFacility: { displayName: string };
  }): RecurringJoinScheduleDto {
    return {
      id: row.id,
      storeOwnershipId: row.storeOwnershipId,
      golfFacilityId: row.golfFacilityId,
      facilityName: row.golfFacility.displayName,
      cadence: row.cadence as RecurringJoinScheduleDto['cadence'],
      dayOfWeek: row.dayOfWeek,
      startTimeLocal: row.startTimeLocal,
      timezone: row.timezone,
      targetMaleCount: row.targetMaleCount,
      targetFemaleCount: row.targetFemaleCount,
      minimumPlayers: row.minimumPlayers,
      matchingRewardTarget:
        row.matchingRewardTarget as RecurringJoinScheduleDto['matchingRewardTarget'],
      rewardPerParticipant: String(row.rewardPerParticipant),
      title: row.title,
      description: row.description,
      recruitClosesHoursBefore: row.recruitClosesHoursBefore,
      status: row.status as RecurringJoinScheduleDto['status'],
      nextRunAt: row.nextRunAt?.toISOString() ?? null,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
