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

export type NearbyPresenceQuery = {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  freshnessMinutes: number;
  viewerUserId?: string;
  limit: number;
};

/**
 * Presence persistence port — Memory (local) or Prisma (Railway).
 * Production must use Prisma; never silent-fallback to Memory on DB failure.
 */
export interface PresenceStore {
  get(userId: string): Promise<StoredPresence | null>;
  upsert(row: StoredPresence): Promise<StoredPresence>;
  hide(userId: string): Promise<StoredPresence | null>;
  /**
   * Coarse bbox candidates + ACTIVE users only.
   * Caller applies Haversine / privacy / DTO mapping.
   */
  findNearbyCandidates(query: NearbyPresenceQuery): Promise<StoredPresence[]>;
}

export const PRESENCE_STORE = Symbol('PRESENCE_STORE');
