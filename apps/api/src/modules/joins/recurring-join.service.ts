import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  HOST_RECURRING_MAX_OCCURRENCES,
  RECURRING_AHEAD_WEEKS,
  defaultRecruitClosesAt,
  listBoundedWeeklyStarts,
  listUpcomingWeeklyStarts,
  nextWeeklyOccurrenceStart,
  occurrenceDateKeyFromStart,
  parseLocalHm,
  shouldEndHostSchedule,
  type IsoWeekday,
} from '@jjoin/domain';
import type {
  CreateHostRecurringJoinScheduleRequest,
  CreateRecurringJoinScheduleRequest,
  CreateStoreMatchingJoinRequest,
  HostJoinRecurringTemplate,
  RecurringJoinRunSummary,
  RecurringJoinScheduleDto,
  SkipRecurringJoinOccurrenceRequest,
  UpdateRecurringJoinScheduleRequest,
} from '@jjoin/types';
import {
  createHostRecurringJoinScheduleSchema,
  createRecurringJoinScheduleSchema,
  skipRecurringJoinOccurrenceSchema,
  updateRecurringJoinScheduleSchema,
} from '@jjoin/validation';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { JoinsService } from './joins.service';
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

type ScheduleRow = {
  id: string;
  ownerUserId: string;
  kind: string;
  storeOwnershipId: string | null;
  golfFacilityId: string | null;
  cadence: string;
  dayOfWeek: number;
  startTimeLocal: string;
  timezone: string;
  targetMaleCount: number | null;
  targetFemaleCount: number | null;
  minimumPlayers: number | null;
  matchingRewardTarget: string | null;
  rewardPerParticipant: Prisma.Decimal | string | null;
  title: string | null;
  description: string | null;
  recruitClosesHoursBefore: number;
  joinTemplateJson: Prisma.JsonValue | null;
  recurrenceStartDate: Date | null;
  recurrenceEndDate: Date | null;
  maxOccurrences: number | null;
  occurrencesCreatedCount: number;
  status: string;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  golfFacility?: { displayName: string } | null;
  occurrences?: Array<{
    occurrenceDate: Date;
    joinId: string | null;
    status: string;
  }>;
};

@Injectable()
export class RecurringJoinService {
  private readonly logger = new Logger(RecurringJoinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingJoins: MatchingJoinsService,
    private readonly joins: JoinsService,
    private readonly notifications: NotificationEventService,
  ) {}

  async listMine(ownerUserId: string): Promise<RecurringJoinScheduleDto[]> {
    const rows = await this.prisma.recurringJoinSchedule.findMany({
      where: {
        ownerUserId,
        status: { not: 'DELETED' },
      },
      include: {
        golfFacility: { select: { displayName: true } },
        occurrences: {
          orderBy: { occurrenceDate: 'desc' },
          take: 5,
          select: { occurrenceDate: true, joinId: true, status: true },
        },
      },
      orderBy: [{ status: 'asc' }, { nextRunAt: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(
    ownerUserId: string,
    raw: CreateRecurringJoinScheduleRequest,
  ): Promise<RecurringJoinScheduleDto> {
    if ('joinTemplate' in raw && raw.joinTemplate) {
      return this.createHost(ownerUserId, raw as CreateHostRecurringJoinScheduleRequest);
    }
    return this.createStore(ownerUserId, raw);
  }

  private async createStore(
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
        kind: 'STORE_MATCHING',
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

  async createHost(
    ownerUserId: string,
    raw: CreateHostRecurringJoinScheduleRequest,
  ): Promise<RecurringJoinScheduleDto> {
    const parsed = createHostRecurringJoinScheduleSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_host_recurring_join_schedule');
    }
    const input = parsed.data;
    try {
      parseLocalHm(input.startTimeLocal);
    } catch {
      throw new BadRequestException('invalid_start_time');
    }

    const dayOfWeek = asIsoWeekday(input.dayOfWeek);
    const startKey = input.recurrenceStartDate;
    const firstStart = occurrenceDateKeyFromStart(
      nextWeeklyOccurrenceStart({
        dayOfWeek,
        startTimeLocal: input.startTimeLocal,
        after: new Date(`${startKey}T00:00:00+09:00`),
      }),
    );
    if (firstStart !== startKey) {
      throw new BadRequestException('recurrence_start_must_match_weekday');
    }

    if (input.maxOccurrences != null && input.maxOccurrences > HOST_RECURRING_MAX_OCCURRENCES) {
      throw new BadRequestException('max_occurrences_exceeded');
    }

    const now = new Date();
    const nextRunAt = nextWeeklyOccurrenceStart({
      dayOfWeek,
      startTimeLocal: input.startTimeLocal,
      after: now,
    });

    const row = await this.prisma.recurringJoinSchedule.create({
      data: {
        ownerUserId,
        kind: 'HOST_JOIN',
        cadence: 'WEEKLY',
        dayOfWeek,
        startTimeLocal: this.normalizeHm(input.startTimeLocal),
        timezone: 'Asia/Seoul',
        title: input.title ?? input.joinTemplate.title ?? null,
        description: input.description ?? input.joinTemplate.description ?? null,
        joinTemplateJson: input.joinTemplate as Prisma.InputJsonValue,
        recurrenceStartDate: dateKeyToPrismaDate(input.recurrenceStartDate),
        recurrenceEndDate: input.recurrenceEndDate
          ? dateKeyToPrismaDate(input.recurrenceEndDate)
          : null,
        maxOccurrences: input.maxOccurrences ?? null,
        occurrencesCreatedCount: 0,
        recruitClosesHoursBefore: 3,
        status: 'ACTIVE',
        nextRunAt,
      },
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
    if (schedule.status === 'DELETED' || schedule.status === 'ENDED') {
      throw new NotFoundException('recurring_schedule_not_found');
    }
    if (schedule.kind === 'HOST_JOIN') {
      throw new BadRequestException('host_recurring_schedule_not_editable');
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

    const male = input.targetMaleCount ?? schedule.targetMaleCount ?? 0;
    const female = input.targetFemaleCount ?? schedule.targetFemaleCount ?? 0;
    const minimum = input.minimumPlayers ?? schedule.minimumPlayers ?? 2;
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
    if (schedule.status === 'DELETED' || schedule.status === 'ENDED') {
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
    if (schedule.status === 'DELETED' || schedule.status === 'ENDED') {
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

  async end(ownerUserId: string, scheduleId: string): Promise<RecurringJoinScheduleDto> {
    await this.requireOwnerSchedule(ownerUserId, scheduleId);
    const row = await this.prisma.recurringJoinSchedule.update({
      where: { id: scheduleId },
      data: { status: 'ENDED', nextRunAt: null },
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
      const dayOfWeek = asIsoWeekday(schedule.dayOfWeek);
      const starts =
        schedule.kind === 'HOST_JOIN'
          ? listBoundedWeeklyStarts({
              dayOfWeek,
              startTimeLocal: schedule.startTimeLocal,
              from: now,
              aheadWeeks: RECURRING_AHEAD_WEEKS,
              recurrenceStartDate: schedule.recurrenceStartDate
                ? prismaDateToKey(schedule.recurrenceStartDate)
                : null,
              recurrenceEndDate: schedule.recurrenceEndDate
                ? prismaDateToKey(schedule.recurrenceEndDate)
                : null,
            })
          : listUpcomingWeeklyStarts({
              dayOfWeek,
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
    const [skips, existingJoins, failedOccurrences] = await Promise.all([
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
      this.prisma.recurringJoinOccurrence.findMany({
        where: {
          scheduleId: { in: scheduleIds },
          occurrenceDate: { in: dateList },
          status: 'CREATED',
          joinId: { not: null },
        },
        select: { scheduleId: true, occurrenceDate: true },
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
    for (const row of failedOccurrences) {
      existingKeys.add(`${row.scheduleId}:${prismaDateToKey(row.occurrenceDate)}`);
    }

    for (const schedule of schedules) {
      const planned = plannedBySchedule.get(schedule.id) ?? [];
      let lastCreatedStart: Date | null = null;
      let lastError: string | null = null;
      let createdThisRun = 0;

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

        if (schedule.kind === 'HOST_JOIN') {
          if (
            schedule.maxOccurrences != null &&
            schedule.occurrencesCreatedCount + createdThisRun >= schedule.maxOccurrences
          ) {
            summary.skipped += 1;
            continue;
          }
        }

        if (schedule.kind === 'STORE_MATCHING') {
          const recruitClosesAt = defaultRecruitClosesAt(
            item.startAt,
            schedule.recruitClosesHoursBefore,
          );
          if (recruitClosesAt.getTime() <= now.getTime()) {
            summary.skipped += 1;
            continue;
          }
        }

        try {
          if (schedule.kind === 'HOST_JOIN') {
            await this.materializeHostOccurrence(schedule, item.startAt, item.dateKey);
          } else {
            await this.materializeStoreOccurrence(schedule, item.startAt, item.dateKey);
          }
          existingKeys.add(key);
          lastCreatedStart = item.startAt;
          createdThisRun += 1;
          summary.created += 1;
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
          if (schedule.kind === 'HOST_JOIN') {
            await this.notifyHostFailure(schedule, item.dateKey, message);
          }
        }
      }

      const nextRunAt = nextWeeklyOccurrenceStart({
        dayOfWeek: asIsoWeekday(schedule.dayOfWeek),
        startTimeLocal: schedule.startTimeLocal,
        after: now,
      });
      const nextKey = occurrenceDateKeyFromStart(nextRunAt);
      const endSchedule =
        schedule.kind === 'HOST_JOIN' &&
        shouldEndHostSchedule({
          occurrencesCreatedCount:
            schedule.occurrencesCreatedCount + createdThisRun,
          maxOccurrences: schedule.maxOccurrences,
          recurrenceEndDate: schedule.recurrenceEndDate
            ? prismaDateToKey(schedule.recurrenceEndDate)
            : null,
          nextOccurrenceDateKey: nextKey,
        });

      await this.prisma.recurringJoinSchedule.update({
        where: { id: schedule.id },
        data: {
          nextRunAt: endSchedule ? null : nextRunAt,
          status: endSchedule ? 'ENDED' : schedule.status,
          ...(createdThisRun > 0
            ? { occurrencesCreatedCount: { increment: createdThisRun } }
            : {}),
          ...(lastCreatedStart ? { lastRunAt: lastCreatedStart } : {}),
          lastError,
        },
      });
    }

    return summary;
  }

  private async materializeStoreOccurrence(
    schedule: ScheduleRow,
    startAt: Date,
    dateKey: string,
  ) {
    if (
      !schedule.storeOwnershipId ||
      schedule.targetMaleCount == null ||
      schedule.targetFemaleCount == null ||
      schedule.minimumPlayers == null ||
      !schedule.matchingRewardTarget ||
      schedule.rewardPerParticipant == null
    ) {
      throw new Error('invalid_store_schedule');
    }
    const recruitClosesAt = defaultRecruitClosesAt(
      startAt,
      schedule.recruitClosesHoursBefore,
    );
    const createBody: CreateStoreMatchingJoinRequest = {
      storeOwnershipId: schedule.storeOwnershipId,
      startAt: startAt.toISOString(),
      recruitClosesAt: recruitClosesAt.toISOString(),
      targetMaleCount: schedule.targetMaleCount,
      targetFemaleCount: schedule.targetFemaleCount,
      minimumPlayers: schedule.minimumPlayers,
      matchingRewardTarget:
        schedule.matchingRewardTarget as CreateStoreMatchingJoinRequest['matchingRewardTarget'],
      rewardPerParticipant: String(schedule.rewardPerParticipant),
      title: schedule.title,
      description: schedule.description,
      idempotencyKey: `recurring:${schedule.id}:${dateKey}`,
      recurringScheduleId: schedule.id,
      recurringOccurrenceDate: dateKey,
    };
    const detail = await this.matchingJoins.create(schedule.ownerUserId, createBody);
    await this.prisma.recurringJoinOccurrence.upsert({
      where: {
        scheduleId_occurrenceDate: {
          scheduleId: schedule.id,
          occurrenceDate: dateKeyToPrismaDate(dateKey),
        },
      },
      create: {
        scheduleId: schedule.id,
        occurrenceDate: dateKeyToPrismaDate(dateKey),
        joinId: detail.joinId,
        status: 'CREATED',
      },
      update: {
        joinId: detail.joinId,
        status: 'CREATED',
        errorMessage: null,
      },
    });
  }

  private async materializeHostOccurrence(
    schedule: ScheduleRow,
    startAt: Date,
    dateKey: string,
  ) {
    const template = schedule.joinTemplateJson as HostJoinRecurringTemplate | null;
    if (!template) throw new Error('missing_join_template');
    const detail = await this.joins.create(schedule.ownerUserId, {
      ...template,
      startAt: startAt.toISOString(),
      idempotencyKey: `recurring:${schedule.id}:${dateKey}`,
      recurringScheduleId: schedule.id,
      recurringOccurrenceDate: dateKey,
    });
    await this.prisma.recurringJoinOccurrence.upsert({
      where: {
        scheduleId_occurrenceDate: {
          scheduleId: schedule.id,
          occurrenceDate: dateKeyToPrismaDate(dateKey),
        },
      },
      create: {
        scheduleId: schedule.id,
        occurrenceDate: dateKeyToPrismaDate(dateKey),
        joinId: detail.joinId,
        status: 'CREATED',
      },
      update: {
        joinId: detail.joinId,
        status: 'CREATED',
        errorMessage: null,
      },
    });
  }

  private async notifyHostFailure(
    schedule: ScheduleRow,
    dateKey: string,
    message: string,
  ) {
    await this.notifications.enqueueSafe({
      userId: schedule.ownerUserId,
      type: NotificationType.RECURRING_JOIN_OCCURRENCE_FAILED,
      title: '반복 조인 자동 생성 실패',
      body: `${dateKey} 회차를 만들지 못했습니다. 코인 잔액·조인 제한을 확인해 주세요.`,
      data: {
        scheduleId: schedule.id,
        occurrenceDate: dateKey,
        reason: message,
      },
      eventKey: `recurring-fail:${schedule.id}:${dateKey}`,
    });
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

  private templateVenueLabel(template: HostJoinRecurringTemplate | null): string | null {
    if (!template) return null;
    if (template.title) return template.title;
    return template.venue?.name ?? null;
  }

  private toDto(row: ScheduleRow): RecurringJoinScheduleDto {
    const template =
      row.joinTemplateJson != null
        ? (row.joinTemplateJson as HostJoinRecurringTemplate)
        : null;
    return {
      id: row.id,
      kind: row.kind as RecurringJoinScheduleDto['kind'],
      storeOwnershipId: row.storeOwnershipId,
      golfFacilityId: row.golfFacilityId,
      facilityName:
        row.golfFacility?.displayName ?? this.templateVenueLabel(template),
      cadence: row.cadence as RecurringJoinScheduleDto['cadence'],
      dayOfWeek: row.dayOfWeek,
      startTimeLocal: row.startTimeLocal,
      timezone: row.timezone,
      targetMaleCount: row.targetMaleCount,
      targetFemaleCount: row.targetFemaleCount,
      minimumPlayers: row.minimumPlayers,
      matchingRewardTarget:
        row.matchingRewardTarget as RecurringJoinScheduleDto['matchingRewardTarget'],
      rewardPerParticipant:
        row.rewardPerParticipant != null ? String(row.rewardPerParticipant) : null,
      title: row.title,
      description: row.description,
      recruitClosesHoursBefore: row.recruitClosesHoursBefore,
      joinTemplate: template,
      recurrenceStartDate: row.recurrenceStartDate
        ? prismaDateToKey(row.recurrenceStartDate)
        : null,
      recurrenceEndDate: row.recurrenceEndDate
        ? prismaDateToKey(row.recurrenceEndDate)
        : null,
      maxOccurrences: row.maxOccurrences,
      occurrencesCreatedCount: row.occurrencesCreatedCount,
      status: row.status as RecurringJoinScheduleDto['status'],
      nextRunAt: row.nextRunAt?.toISOString() ?? null,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      lastError: row.lastError,
      recentOccurrences: row.occurrences?.map((o) => ({
        occurrenceDate: prismaDateToKey(o.occurrenceDate),
        joinId: o.joinId,
        status: o.status as 'CREATED' | 'SKIPPED' | 'FAILED',
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
