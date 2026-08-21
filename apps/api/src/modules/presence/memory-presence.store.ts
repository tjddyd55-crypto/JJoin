import { PresenceVisibility } from '@jjoin/types';
import type { NearbyPresenceQuery, PresenceStore, StoredPresence } from './presence.store';
import { haversineMeters } from './privacy-location';

/**
 * In-memory presence for local/dev without Postgres.
 * Never use as silent Production fallback.
 */
export class MemoryPresenceStore implements PresenceStore {
  private byUser = new Map<string, StoredPresence>();

  async get(userId: string): Promise<StoredPresence | null> {
    return this.byUser.get(userId) ?? null;
  }

  async upsert(row: StoredPresence): Promise<StoredPresence> {
    this.byUser.set(row.userId, row);
    return row;
  }

  async hide(userId: string): Promise<StoredPresence | null> {
    const current = this.byUser.get(userId);
    if (!current) return null;
    const next: StoredPresence = {
      ...current,
      visibility: PresenceVisibility.HIDDEN,
      availableUntil: null,
      updatedAt: new Date(),
    };
    this.byUser.set(userId, next);
    return next;
  }

  async findNearbyCandidates(query: NearbyPresenceQuery): Promise<StoredPresence[]> {
    const now = Date.now();
    const freshAfter = now - query.freshnessMinutes * 60_000;
    const rows = [...this.byUser.values()].filter((p) => {
      if (query.viewerUserId && p.userId === query.viewerUserId) return false;
      if (p.visibility !== PresenceVisibility.AVAILABLE) return false;
      if (!p.availableUntil || p.availableUntil.getTime() <= now) return false;
      if (p.lastLocationAt.getTime() < freshAfter) return false;
      const d = haversineMeters(
        query.centerLat,
        query.centerLng,
        p.latitude,
        p.longitude,
      );
      return d <= query.radiusMeters;
    });
    rows.sort((a, b) => b.lastLocationAt.getTime() - a.lastLocationAt.getTime());
    return rows.slice(0, Math.max(query.limit * 4, query.limit));
  }

  clear() {
    this.byUser.clear();
  }
}
