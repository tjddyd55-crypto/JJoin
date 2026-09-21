import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { selectVisibleHomeBanners } from '@jjoin/domain';
import type { HomeBannerDto, UpsertHomeBannerRequest } from '@jjoin/types';
import { upsertHomeBannerSchema } from '@jjoin/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Admin upsert still writes an object key. If the client echoes a resolved
 * `/media/objects?key=` URL, persist the key so the DB never stores delivery URLs.
 */
export function toStoredHomeBannerImageObjectKey(
  imageUrl: string | null | undefined,
): string | null {
  const value = imageUrl?.trim() ?? '';
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const isMediaObjects =
      parsed.pathname === '/media/objects' || parsed.pathname.endsWith('/media/objects');
    if (isMediaObjects) {
      const key = parsed.searchParams.get('key')?.trim();
      if (key) return key;
    }
  } catch {
    // Bare object key or non-URL value — store as-is.
  }
  return value;
}

@Injectable()
export class HomeBannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly storage: ObjectStorageService,
  ) {}

  async listPublic(): Promise<HomeBannerDto[]> {
    const flags = await this.flags.getFlags();
    if (!flags.homeBannersEnabled) return [];
    const rows = await this.prisma.homeBanner.findMany();
    const visible = selectVisibleHomeBanners(
      rows.map((row) => ({
        ...row,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      })),
      new Date(),
    );
    return visible.map((row) => this.toDto(row));
  }

  async listAdmin(): Promise<HomeBannerDto[]> {
    const rows = await this.prisma.homeBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
    return rows.map((row) => this.toDto(row));
  }

  async upsert(id: string | null, body: unknown, updatedBy?: string): Promise<HomeBannerDto> {
    const parsed = upsertHomeBannerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ code: 'home_banner_invalid', issues: parsed.error.issues });
    }
    const data = parsed.data as UpsertHomeBannerRequest;
    const bannerId = id ?? randomUUID();
    const row = await this.prisma.homeBanner.upsert({
      where: { id: bannerId },
      create: {
        id: bannerId,
        title: data.title,
        subtitle: data.subtitle ?? null,
        imageObjectKey: toStoredHomeBannerImageObjectKey(data.imageUrl),
        href: data.href ?? null,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        updatedByUserId: updatedBy ?? null,
      },
      update: {
        title: data.title,
        subtitle: data.subtitle ?? null,
        imageObjectKey: toStoredHomeBannerImageObjectKey(data.imageUrl),
        href: data.href ?? null,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        updatedByUserId: updatedBy ?? null,
      },
    });
    return this.toDto(row);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.homeBanner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('home_banner_not_found');
    await this.prisma.homeBanner.delete({ where: { id } });
    return { ok: true };
  }

  private toDto(row: {
    id: string;
    title: string;
    subtitle: string | null;
    imageObjectKey: string | null;
    href: string | null;
    sortOrder: number;
    active: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  }): HomeBannerDto {
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      imageUrl: this.storage.getPublicUrl(row.imageObjectKey),
      href: row.href,
      sortOrder: row.sortOrder,
      active: row.active,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
    };
  }
}
