import { BadRequestException, Injectable } from '@nestjs/common';
import {
  canUseProfileMatchAlerts,
  matchesProfileMatchPreference,
  profileMatchNotificationEventKey,
  validateProfileMatchPreference,
} from '@jjoin/domain';
import {
  DrinkingHabit,
  ProfileMatchPreferredGender,
  SmokingHabit,
  type ProfileMatchPreferenceDto,
  type UpsertProfileMatchPreferenceRequest,
} from '@jjoin/types';
import { profileMatchPreferenceSchema } from '@jjoin/validation';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEventService } from '../notifications/notification-event.service';
import { PremiumService } from '../payments/premium.service';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable()
export class ProfileMatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly premium: PremiumService,
    private readonly notifications: NotificationEventService,
  ) {}

  async getMine(userId: string): Promise<ProfileMatchPreferenceDto> {
    const row = await this.prisma.profileMatchPreference.findUnique({ where: { userId } });
    return this.toDto(row, userId);
  }

  async upsertMine(userId: string, body: unknown): Promise<ProfileMatchPreferenceDto> {
    const parsed = profileMatchPreferenceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'profile_match_invalid', issues: parsed.error.issues });
    }
    const data = parsed.data as UpsertProfileMatchPreferenceRequest;
    const current = await this.getMine(userId);
    const next = {
      enabled: data.enabled ?? current.enabled,
      preferredGender: data.preferredGender ?? current.preferredGender,
      minAge: data.minAge === undefined ? current.minAge : data.minAge,
      maxAge: data.maxAge === undefined ? current.maxAge : data.maxAge,
      minFieldHandicap:
        data.minFieldHandicap === undefined ? current.minFieldHandicap : data.minFieldHandicap,
      maxFieldHandicap:
        data.maxFieldHandicap === undefined ? current.maxFieldHandicap : data.maxFieldHandicap,
      minScreenHandicap:
        data.minScreenHandicap === undefined ? current.minScreenHandicap : data.minScreenHandicap,
      maxScreenHandicap:
        data.maxScreenHandicap === undefined ? current.maxScreenHandicap : data.maxScreenHandicap,
      drinkingHabits: data.drinkingHabits ?? current.drinkingHabits,
      smokingHabits: data.smokingHabits ?? current.smokingHabits,
      sido: data.sido === undefined ? current.sido : data.sido,
      sigungu: data.sigungu === undefined ? current.sigungu : data.sigungu,
    };
    const valid = validateProfileMatchPreference(next);
    if (!valid.ok) throw new BadRequestException(valid.code);

    const row = await this.prisma.profileMatchPreference.upsert({
      where: { userId },
      create: { userId, ...next },
      update: next,
    });
    return this.toDto(row, userId);
  }

  async notifyMatchingJoin(joinId: string): Promise<void> {
    const flags = await this.flags.getFlags();
    if (!flags.profileMatchAlertsEnabled) return;

    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        host: {
          include: {
            profile: true,
            sportProfiles: true,
          },
        },
        venue: true,
      },
    });
    if (!join || !['OPEN', 'FULL', 'CONFIRMED'].includes(join.status)) return;

    const host = join.host;
    const golfSport = host.sportProfiles[0];
    const candidate = {
      gender: host.profile?.gender ?? null,
      age: host.profile?.age ?? null,
      fieldHandicap: golfSport?.fieldHandicap ?? null,
      screenHandicap: golfSport?.screenHandicap ?? null,
      drinking: (host.profile?.drinking as DrinkingHabit | null) ?? null,
      smoking: (host.profile?.smoking as SmokingHabit | null) ?? null,
      sido: join.venue.region ?? null,
      sigungu: null,
    };

    const prefs = await this.prisma.profileMatchPreference.findMany({
      where: { enabled: true, userId: { not: join.hostUserId } },
    });

    for (const pref of prefs) {
      const matched = matchesProfileMatchPreference(
        {
          enabled: pref.enabled,
          preferredGender: pref.preferredGender,
          minAge: pref.minAge,
          maxAge: pref.maxAge,
          minFieldHandicap: pref.minFieldHandicap,
          maxFieldHandicap: pref.maxFieldHandicap,
          minScreenHandicap: pref.minScreenHandicap,
          maxScreenHandicap: pref.maxScreenHandicap,
          drinkingHabits: pref.drinkingHabits as DrinkingHabit[],
          smokingHabits: pref.smokingHabits as SmokingHabit[],
          sido: pref.sido,
          sigungu: pref.sigungu,
        },
        candidate,
      );
      if (!matched) continue;

      const premium = await this.premium.getStatus(pref.userId);
      if (!canUseProfileMatchAlerts({ premiumActive: premium.active })) continue;

      await this.notifications.enqueueSafe({
        userId: pref.userId,
        type: NotificationType.PROFILE_MATCH_JOIN,
        title: '프로필 조건에 맞는 조인',
        body: `${host.profile?.nickname ?? '호스트'}님의 조인이 조건과 맞습니다.`,
        data: { type: NotificationType.PROFILE_MATCH_JOIN, joinId: join.id },
        eventKey: profileMatchNotificationEventKey({
          subscriberUserId: pref.userId,
          joinId: join.id,
        }),
      });
    }
  }

  private toDto(
    row: {
      enabled: boolean;
      preferredGender: string;
      minAge: number | null;
      maxAge: number | null;
      minFieldHandicap: number | null;
      maxFieldHandicap: number | null;
      minScreenHandicap: number | null;
      maxScreenHandicap: number | null;
      drinkingHabits: string[];
      smokingHabits: string[];
      sido: string | null;
      sigungu: string | null;
      updatedAt: Date;
    } | null,
    _userId: string,
  ): ProfileMatchPreferenceDto {
    return {
      enabled: row?.enabled ?? true,
      preferredGender: (row?.preferredGender as ProfileMatchPreferredGender) ?? ProfileMatchPreferredGender.ANY,
      minAge: row?.minAge ?? null,
      maxAge: row?.maxAge ?? null,
      minFieldHandicap: row?.minFieldHandicap ?? null,
      maxFieldHandicap: row?.maxFieldHandicap ?? null,
      minScreenHandicap: row?.minScreenHandicap ?? null,
      maxScreenHandicap: row?.maxScreenHandicap ?? null,
      drinkingHabits: (row?.drinkingHabits ?? []) as DrinkingHabit[],
      smokingHabits: (row?.smokingHabits ?? []) as SmokingHabit[],
      sido: row?.sido ?? null,
      sigungu: row?.sigungu ?? null,
      updatedAt: (row?.updatedAt ?? new Date()).toISOString(),
    };
  }
}
