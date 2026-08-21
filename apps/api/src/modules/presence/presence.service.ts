import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PresenceVisibility,
  type PresenceDurationOption,
  type PrivatePresenceDto,
  type UpsertPresenceRequest,
} from '@jjoin/types';
import { memoryPresenceStore } from './memory-presence.store';
import { presenceConfig } from './presence.config';

@Injectable()
export class PresenceService {
  getMine(userId: string): PrivatePresenceDto {
    const row = memoryPresenceStore.get(userId);
    if (!row) {
      return {
        visibility: PresenceVisibility.HIDDEN,
        availableUntil: null,
        accuracyMeters: null,
        lastLocationAt: null,
        hasLocation: false,
      };
    }
    const expired =
      row.visibility === PresenceVisibility.AVAILABLE &&
      row.availableUntil != null &&
      row.availableUntil.getTime() <= Date.now();
    return {
      visibility: expired ? PresenceVisibility.HIDDEN : row.visibility,
      availableUntil: row.availableUntil?.toISOString() ?? null,
      accuracyMeters: row.accuracyMeters,
      lastLocationAt: row.lastLocationAt.toISOString(),
      hasLocation: true,
    };
  }

  upsert(userId: string, body: UpsertPresenceRequest): PrivatePresenceDto {
    this.assertCoordinate(body.latitude, body.longitude);
    const minutes = presenceConfig.durationMinutes[body.duration];
    if (!minutes) throw new BadRequestException('invalid_duration');

    const now = new Date();
    const availableUntil = new Date(now.getTime() + minutes * 60_000);
    memoryPresenceStore.upsert({
      userId,
      visibility: PresenceVisibility.AVAILABLE,
      availableUntil,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters ?? null,
      lastLocationAt: now,
      updatedAt: now,
    });
    return this.getMine(userId);
  }

  hide(userId: string): PrivatePresenceDto {
    memoryPresenceStore.hide(userId);
    return this.getMine(userId);
  }

  /** Safe default on logout: stop appearing nearby. */
  hideOnLogout(userId: string) {
    memoryPresenceStore.hide(userId);
  }

  private assertCoordinate(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('invalid_coordinate');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('invalid_coordinate');
    }
  }
}

export type { PresenceDurationOption };
