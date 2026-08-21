import { PresenceVisibility } from '@jjoin/types';

export type StoredPresence = {
  userId: string;
  visibility: PresenceVisibility;
  availableUntil: Date | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  lastLocationAt: Date;
  updatedAt: Date;
};

/**
 * In-memory presence store for Phase D (works with mock auth users).
 * Prisma UserPresence schema is the long-term model; switch via repository later.
 */
export class MemoryPresenceStore {
  private byUser = new Map<string, StoredPresence>();

  get(userId: string): StoredPresence | null {
    return this.byUser.get(userId) ?? null;
  }

  upsert(row: StoredPresence): StoredPresence {
    this.byUser.set(row.userId, row);
    return row;
  }

  hide(userId: string): StoredPresence | null {
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

  listAvailable(): StoredPresence[] {
    const now = Date.now();
    return [...this.byUser.values()].filter(
      (p) =>
        p.visibility === PresenceVisibility.AVAILABLE &&
        p.availableUntil != null &&
        p.availableUntil.getTime() > now,
    );
  }

  clear() {
    this.byUser.clear();
  }
}

export const memoryPresenceStore = new MemoryPresenceStore();
