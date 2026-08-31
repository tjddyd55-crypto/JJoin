import { Injectable, Logger } from '@nestjs/common';
import { ProductEventType, Prisma } from '@prisma/client';
import { productEventBatchSchema } from '@jjoin/validation';
import type { GrowthAnalyticsDto, GrowthAnalyticsPeriod, TrackProductEventsRequest } from '@jjoin/types';
import { computeConversionRate, computeCtr } from '@jjoin/domain';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductEventsService {
  private readonly logger = new Logger(ProductEventsService.name);
  private readonly impressionDedupe = new Map<string, number>();
  private readonly DEDUPE_TTL_MS = 30 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget — never throws to callers. */
  trackSafe(userId: string | null, input: TrackProductEventsRequest): void {
    void this.track(userId, input).catch((e) => {
      const msg = e instanceof Error ? e.message : 'track_failed';
      this.logger.warn(`product_event_track_failed err=${msg}`);
    });
  }

  async track(userId: string | null, raw: TrackProductEventsRequest): Promise<{ accepted: number }> {
    const parsed = productEventBatchSchema.safeParse(raw);
    if (!parsed.success) return { accepted: 0 };

    const now = Date.now();
    this.pruneDedupe(now);

    const rows: Prisma.ProductEventCreateManyInput[] = [];
    for (const ev of parsed.data.events) {
      if (ev.dedupeKey) {
        const key = `${userId ?? 'anon'}:${ev.dedupeKey}`;
        if (this.impressionDedupe.has(key)) continue;
        this.impressionDedupe.set(key, now);
      }
      rows.push({
        eventType: ev.eventType as ProductEventType,
        userId,
        joinId: ev.joinId ?? null,
        golfFacilityId: ev.golfFacilityId ?? null,
        source: ev.source ?? 'mobile',
        metadata: (ev.metadata ?? {}) as Prisma.InputJsonValue,
      });
    }

    if (rows.length === 0) return { accepted: 0 };
    await this.prisma.productEvent.createMany({ data: rows });
    return { accepted: rows.length };
  }

  async trackOne(input: {
    eventType: ProductEventType;
    userId?: string | null;
    joinId?: string | null;
    golfFacilityId?: string | null;
    source?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.productEvent.create({
      data: {
        eventType: input.eventType,
        userId: input.userId ?? null,
        joinId: input.joinId ?? null,
        golfFacilityId: input.golfFacilityId ?? null,
        source: input.source ?? 'api',
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async getGrowthAnalytics(period: GrowthAnalyticsPeriod = '30d'): Promise<GrowthAnalyticsDto> {
    const since = this.periodStart(period);
    const where = since ? { createdAt: { gte: since } } : {};

    const counts = async (type: ProductEventType) =>
      this.prisma.productEvent.count({ where: { ...where, eventType: type } });

    const [
      recImpression,
      recClick,
      recJoined,
      shareOpened,
      shareCta,
      shareJoined,
      urgentOpened,
      urgentViewed,
      urgentJoined,
      urgentFilled,
      recurringCreated,
      recurringFilled,
      inviteSent,
      inviteAccepted,
      followSent,
      followClick,
      followJoined,
    ] = await Promise.all([
      counts(ProductEventType.RECOMMENDATION_IMPRESSION),
      counts(ProductEventType.RECOMMENDATION_CLICK),
      counts(ProductEventType.RECOMMENDATION_JOINED),
      counts(ProductEventType.SHARE_LINK_OPENED),
      counts(ProductEventType.SHARE_JOIN_CTA_CLICKED),
      counts(ProductEventType.RECOMMENDATION_JOINED),
      counts(ProductEventType.URGENT_JOIN_OPENED),
      counts(ProductEventType.URGENT_JOIN_VIEWED),
      counts(ProductEventType.URGENT_JOIN_JOINED),
      counts(ProductEventType.URGENT_JOIN_FILLED),
      counts(ProductEventType.RECURRING_OCCURRENCE_CREATED),
      counts(ProductEventType.RECURRING_JOIN_FILLED),
      counts(ProductEventType.JOIN_INVITATION_SENT),
      counts(ProductEventType.JOIN_INVITATION_ACCEPTED),
      counts(ProductEventType.FOLLOWED_STORE_NEW_JOIN_SENT),
      counts(ProductEventType.FOLLOWED_STORE_JOIN_CLICK),
      counts(ProductEventType.FOLLOWED_STORE_JOINED),
    ]);

    return {
      period,
      recommendation: {
        impressions: recImpression,
        clicks: recClick,
        joined: recJoined,
        ctrPercent: computeCtr(recClick, recImpression),
        joinConversionPercent: computeConversionRate(recJoined, recClick),
      },
      share: {
        opened: shareOpened,
        ctaClicked: shareCta,
        joined: shareJoined,
        ctaRatePercent: computeConversionRate(shareCta, shareOpened),
      },
      urgent: {
        opened: urgentOpened,
        viewed: urgentViewed,
        joined: urgentJoined,
        filled: urgentFilled,
        fillRatePercent: computeConversionRate(urgentFilled, urgentOpened),
      },
      recurring: {
        occurrencesCreated: recurringCreated,
        filled: recurringFilled,
        fillRatePercent: computeConversionRate(recurringFilled, recurringCreated),
      },
      invitation: {
        sent: inviteSent,
        accepted: inviteAccepted,
        acceptRatePercent: computeConversionRate(inviteAccepted, inviteSent),
      },
      follow: {
        notificationsSent: followSent,
        clicks: followClick,
        joined: followJoined,
      },
    };
  }

  async getOwnerFacilityMetrics(
    golfFacilityId: string,
    period: GrowthAnalyticsPeriod = '30d',
  ): Promise<{
    followJoined: number;
    urgentFilled: number;
    recurringFilled: number;
    invitationAccepted: number;
  }> {
    const since = this.periodStart(period);
    const base = {
      golfFacilityId,
      ...(since ? { createdAt: { gte: since } } : {}),
    };
    const [followJoined, urgentFilled, recurringFilled, invitationAccepted] = await Promise.all([
      this.prisma.productEvent.count({
        where: { ...base, eventType: ProductEventType.FOLLOWED_STORE_JOINED },
      }),
      this.prisma.productEvent.count({
        where: { ...base, eventType: ProductEventType.URGENT_JOIN_FILLED },
      }),
      this.prisma.productEvent.count({
        where: { ...base, eventType: ProductEventType.RECURRING_JOIN_FILLED },
      }),
      this.prisma.productEvent.count({
        where: { ...base, eventType: ProductEventType.JOIN_INVITATION_ACCEPTED },
      }),
    ]);
    return { followJoined, urgentFilled, recurringFilled, invitationAccepted };
  }

  private periodStart(period: GrowthAnalyticsPeriod): Date | null {
    if (period === 'all') return null;
    const days = period === '7d' ? 7 : 30;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private pruneDedupe(now: number): void {
    for (const [k, ts] of this.impressionDedupe) {
      if (now - ts > this.DEDUPE_TTL_MS) this.impressionDedupe.delete(k);
    }
  }
}
