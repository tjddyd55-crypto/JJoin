import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  JoinAlertDateMode,
  JoinAlertTimeBand,
  type CreateJoinAlertSubscriptionRequest,
  type JoinAlertSubscriptionDto,
  type UpdateJoinAlertSubscriptionRequest,
} from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';

const DATE_MODES = new Set<string>(Object.values(JoinAlertDateMode));
const TIME_BANDS = new Set<string>(Object.values(JoinAlertTimeBand));

@Injectable()
export class JoinAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<JoinAlertSubscriptionDto[]> {
    const rows = await this.prisma.joinAlertSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(
    userId: string,
    raw: CreateJoinAlertSubscriptionRequest,
  ): Promise<JoinAlertSubscriptionDto> {
    const input = this.parseCreate(raw);
    const row = await this.prisma.joinAlertSubscription.create({
      data: {
        userId,
        label: input.label,
        sido: input.sido,
        sigungu: input.sigungu,
        dateMode: input.dateMode,
        specificDate: input.specificDate,
        timeBand: input.timeBand,
        joinableOnly: input.joinableOnly,
        enabled: true,
      },
    });
    return this.toDto(row);
  }

  async update(
    userId: string,
    id: string,
    raw: UpdateJoinAlertSubscriptionRequest,
  ): Promise<JoinAlertSubscriptionDto> {
    const existing = await this.requireOwned(userId, id);
    const patch = this.parseUpdate(raw, existing.dateMode);

    const row = await this.prisma.joinAlertSubscription.update({
      where: { id },
      data: {
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.sido !== undefined ? { sido: patch.sido } : {}),
        ...(patch.sigungu !== undefined ? { sigungu: patch.sigungu } : {}),
        ...(patch.dateMode !== undefined ? { dateMode: patch.dateMode } : {}),
        ...(patch.specificDate !== undefined ? { specificDate: patch.specificDate } : {}),
        ...(patch.timeBand !== undefined ? { timeBand: patch.timeBand } : {}),
        ...(patch.joinableOnly !== undefined ? { joinableOnly: patch.joinableOnly } : {}),
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      },
    });
    return this.toDto(row);
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    await this.requireOwned(userId, id);
    await this.prisma.joinAlertSubscription.delete({ where: { id } });
    return { ok: true };
  }

  private async requireOwned(userId: string, id: string) {
    const row = await this.prisma.joinAlertSubscription.findUnique({ where: { id } });
    if (!row) throw new NotFoundException({ code: 'JOIN_ALERT_NOT_FOUND', message: '알림 조건이 없습니다.' });
    if (row.userId !== userId) {
      throw new ForbiddenException({ code: 'JOIN_ALERT_FORBIDDEN', message: '알림 조건에 접근할 수 없습니다.' });
    }
    return row;
  }

  private parseCreate(raw: CreateJoinAlertSubscriptionRequest) {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException({ code: 'INVALID_JOIN_ALERT', message: '알림 조건이 올바르지 않습니다.' });
    }
    const dateMode = raw.dateMode;
    if (!DATE_MODES.has(dateMode)) {
      throw new BadRequestException({ code: 'INVALID_JOIN_ALERT_DATE_MODE', message: '날짜 조건이 올바르지 않습니다.' });
    }
    const timeBand = raw.timeBand ?? JoinAlertTimeBand.ANY;
    if (!TIME_BANDS.has(timeBand)) {
      throw new BadRequestException({ code: 'INVALID_JOIN_ALERT_TIME_BAND', message: '시간대 조건이 올바르지 않습니다.' });
    }
    const specificDate = this.parseSpecificDate(dateMode, raw.specificDate);
    return {
      label: emptyToNull(raw.label),
      sido: emptyToNull(raw.sido),
      sigungu: emptyToNull(raw.sigungu),
      dateMode: dateMode as JoinAlertDateMode,
      specificDate,
      timeBand: timeBand as JoinAlertTimeBand,
      joinableOnly: raw.joinableOnly !== false,
    };
  }

  private parseUpdate(
    raw: UpdateJoinAlertSubscriptionRequest,
    currentDateMode: string,
  ) {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException({ code: 'INVALID_JOIN_ALERT', message: '알림 조건이 올바르지 않습니다.' });
    }
    const dateMode =
      raw.dateMode !== undefined
        ? (DATE_MODES.has(raw.dateMode)
            ? (raw.dateMode as JoinAlertDateMode)
            : (() => {
                throw new BadRequestException({
                  code: 'INVALID_JOIN_ALERT_DATE_MODE',
                  message: '날짜 조건이 올바르지 않습니다.',
                });
              })())
        : undefined;
    const timeBand =
      raw.timeBand !== undefined
        ? (TIME_BANDS.has(raw.timeBand)
            ? (raw.timeBand as JoinAlertTimeBand)
            : (() => {
                throw new BadRequestException({
                  code: 'INVALID_JOIN_ALERT_TIME_BAND',
                  message: '시간대 조건이 올바르지 않습니다.',
                });
              })())
        : undefined;

    const effectiveDateMode = dateMode ?? currentDateMode;
    let specificDate: Date | null | undefined;
    if (raw.specificDate !== undefined || dateMode !== undefined) {
      specificDate = this.parseSpecificDate(
        effectiveDateMode,
        raw.specificDate,
        dateMode === JoinAlertDateMode.SPECIFIC_DATE ||
          (dateMode === undefined && effectiveDateMode === JoinAlertDateMode.SPECIFIC_DATE),
      );
    }

    return {
      label: raw.label !== undefined ? emptyToNull(raw.label) : undefined,
      sido: raw.sido !== undefined ? emptyToNull(raw.sido) : undefined,
      sigungu: raw.sigungu !== undefined ? emptyToNull(raw.sigungu) : undefined,
      dateMode,
      specificDate,
      timeBand,
      joinableOnly: raw.joinableOnly,
      enabled: raw.enabled,
    };
  }

  private parseSpecificDate(
    dateMode: string,
    value: string | undefined,
    requireWhenSpecific = true,
  ): Date | null {
    if (dateMode !== JoinAlertDateMode.SPECIFIC_DATE) return null;
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      if (!requireWhenSpecific && value == null) return null;
      throw new BadRequestException({
        code: 'INVALID_JOIN_ALERT_SPECIFIC_DATE',
        message: '특정 날짜(YYYY-MM-DD)가 필요합니다.',
      });
    }
    return new Date(`${value}T00:00:00.000Z`);
  }

  private toDto(row: {
    id: string;
    label: string | null;
    sido: string | null;
    sigungu: string | null;
    dateMode: string;
    specificDate: Date | null;
    timeBand: string;
    joinableOnly: boolean;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): JoinAlertSubscriptionDto {
    return {
      id: row.id,
      label: row.label,
      sido: row.sido,
      sigungu: row.sigungu,
      dateMode: row.dateMode as JoinAlertDateMode,
      specificDate: row.specificDate
        ? row.specificDate.toISOString().slice(0, 10)
        : null,
      timeBand: row.timeBand as JoinAlertTimeBand,
      joinableOnly: row.joinableOnly,
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}
