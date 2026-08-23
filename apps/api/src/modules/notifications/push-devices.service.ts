import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PushPlatform, PushProviderKind } from '@prisma/client';
import { registerPushDeviceSchema } from '@jjoin/validation';
import type { PushDeviceDto, RegisterPushDeviceRequest } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';

const REGISTER_RATE_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_RATE_LIMIT = 40;

@Injectable()
export class PushDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, raw: RegisterPushDeviceRequest): Promise<PushDeviceDto> {
    const parsed = registerPushDeviceSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException('invalid_push_device');
    }
    const { pushToken, platform, deviceId } = parsed.data;
    const since = new Date(Date.now() - REGISTER_RATE_WINDOW_MS);
    const recent = await this.prisma.pushDevice.count({
      where: { userId, updatedAt: { gte: since } },
    });
    if (recent >= REGISTER_RATE_LIMIT) {
      throw new BadRequestException('push_device_rate_limited');
    }

    const now = new Date();
    const row = await this.prisma.pushDevice.upsert({
      where: { pushToken },
      create: {
        userId,
        pushToken,
        platform: platform as PushPlatform,
        provider: PushProviderKind.EXPO,
        deviceId: deviceId ?? null,
        active: true,
        lastSeenAt: now,
      },
      update: {
        userId,
        platform: platform as PushPlatform,
        deviceId: deviceId ?? null,
        active: true,
        lastSeenAt: now,
      },
    });

    return this.toDto(row);
  }

  async list(userId: string): Promise<PushDeviceDto[]> {
    const rows = await this.prisma.pushDevice.findMany({
      where: { userId, active: true },
      orderBy: { lastSeenAt: 'desc' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async deactivate(userId: string, deviceId: string): Promise<{ ok: boolean }> {
    const row = await this.prisma.pushDevice.findUnique({ where: { id: deviceId } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException('push_device_not_found');
    }
    await this.prisma.pushDevice.update({
      where: { id: deviceId },
      data: { active: false },
    });
    return { ok: true };
  }

  async deactivateByToken(userId: string, pushToken: string): Promise<{ ok: boolean }> {
    if (!pushToken || pushToken.length < 8) {
      throw new BadRequestException('invalid_push_token');
    }
    await this.prisma.pushDevice.updateMany({
      where: { userId, pushToken, active: true },
      data: { active: false },
    });
    return { ok: true };
  }

  private toDto(row: {
    id: string;
    platform: PushPlatform;
    active: boolean;
    lastSeenAt: Date;
    createdAt: Date;
  }): PushDeviceDto {
    return {
      id: row.id,
      platform: row.platform as PushDeviceDto['platform'],
      active: row.active,
      lastSeenAt: row.lastSeenAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
