import { PresenceVisibility } from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { NearbyPresenceQuery, PresenceStore, StoredPresence } from './presence.store';

export class PrismaPresenceStore implements PresenceStore {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<StoredPresence | null> {
    const row = await this.prisma.userPresence.findUnique({ where: { userId } });
    return row ? this.toStored(row) : null;
  }

  async upsert(row: StoredPresence): Promise<StoredPresence> {
    const saved = await this.prisma.userPresence.upsert({
      where: { userId: row.userId },
      create: {
        userId: row.userId,
        visibility: row.visibility,
        availableUntil: row.availableUntil,
        latitude: row.latitude,
        longitude: row.longitude,
        accuracyMeters: row.accuracyMeters,
        lastLocationAt: row.lastLocationAt,
      },
      update: {
        visibility: row.visibility,
        availableUntil: row.availableUntil,
        latitude: row.latitude,
        longitude: row.longitude,
        accuracyMeters: row.accuracyMeters,
        lastLocationAt: row.lastLocationAt,
      },
    });
    return this.toStored(saved);
  }

  async hide(userId: string): Promise<StoredPresence | null> {
    const existing = await this.prisma.userPresence.findUnique({ where: { userId } });
    if (!existing) return null;
    const saved = await this.prisma.userPresence.update({
      where: { userId },
      data: {
        visibility: PresenceVisibility.HIDDEN,
        availableUntil: null,
      },
    });
    return this.toStored(saved);
  }

  async findNearbyCandidates(query: NearbyPresenceQuery): Promise<StoredPresence[]> {
    const now = new Date();
    const freshAfter = new Date(now.getTime() - query.freshnessMinutes * 60_000);
    const latDelta = query.radiusMeters / 111_320;
    const cos = Math.cos((query.centerLat * Math.PI) / 180) || 1;
    const lngDelta = query.radiusMeters / (111_320 * cos);

    const rows = await this.prisma.userPresence.findMany({
      where: {
        visibility: 'AVAILABLE',
        availableUntil: { gt: now },
        lastLocationAt: { gte: freshAfter },
        latitude: {
          gte: query.centerLat - latDelta,
          lte: query.centerLat + latDelta,
        },
        longitude: {
          gte: query.centerLng - lngDelta,
          lte: query.centerLng + lngDelta,
        },
        ...(query.viewerUserId
          ? { userId: { not: query.viewerUserId } }
          : {}),
        user: { status: 'ACTIVE' },
      },
      orderBy: { lastLocationAt: 'desc' },
      take: Math.max(query.limit * 4, query.limit),
    });

    return rows.map((r) => this.toStored(r));
  }

  private toStored(row: {
    userId: string;
    visibility: string;
    availableUntil: Date | null;
    latitude: Prisma.Decimal;
    longitude: Prisma.Decimal;
    accuracyMeters: number | null;
    lastLocationAt: Date;
    updatedAt: Date;
  }): StoredPresence {
    return {
      userId: row.userId,
      visibility: row.visibility as PresenceVisibility,
      availableUntil: row.availableUntil,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      accuracyMeters: row.accuracyMeters,
      lastLocationAt: row.lastLocationAt,
      updatedAt: row.updatedAt,
    };
  }
}
