import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MAX_JOIN_REGION_PREFERENCES,
  findAdminDistrict,
} from '@jjoin/domain';
import type {
  UpsertUserJoinRegionPreferenceRequest,
  UserJoinRegionPreferenceDto,
  UserJoinRegionPreferenceListResponse,
} from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MeJoinRegionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<UserJoinRegionPreferenceListResponse> {
    const rows = await this.prisma.userJoinRegionPreference.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return { items: rows.map((r) => this.toDto(r)) };
  }

  async upsert(
    userId: string,
    body: UpsertUserJoinRegionPreferenceRequest,
  ): Promise<UserJoinRegionPreferenceDto> {
    const sido = body.sido?.trim();
    const sigungu = body.sigungu?.trim();
    if (!sido || !sigungu) {
      throw new BadRequestException({
        code: 'DISTRICT_REQUIRED',
        message: '시·도와 시군구를 지정해 주세요.',
      });
    }

    const district = findAdminDistrict(sido, sigungu);
    if (!district) {
      throw new BadRequestException({
        code: 'UNKNOWN_DISTRICT',
        message: '지원하지 않는 행정구역입니다.',
      });
    }

    const label = body.label?.trim() || district.label;

    const existing = await this.prisma.userJoinRegionPreference.findUnique({
      where: {
        userId_sido_sigungu: { userId, sido, sigungu },
      },
    });

    if (existing) {
      const updated = await this.prisma.userJoinRegionPreference.update({
        where: { id: existing.id },
        data: { label },
      });
      return this.toDto(updated);
    }

    const count = await this.prisma.userJoinRegionPreference.count({
      where: { userId },
    });
    if (count >= MAX_JOIN_REGION_PREFERENCES) {
      throw new BadRequestException({
        code: 'REGION_PREFERENCE_LIMIT',
        message: `선호 지역은 최대 ${MAX_JOIN_REGION_PREFERENCES}개까지 저장할 수 있습니다.`,
      });
    }

    try {
      const created = await this.prisma.userJoinRegionPreference.create({
        data: {
          userId,
          sido,
          sigungu,
          label,
          sortOrder: count,
        },
      });
      return this.toDto(created);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const raced = await this.prisma.userJoinRegionPreference.findUnique({
          where: {
            userId_sido_sigungu: { userId, sido, sigungu },
          },
        });
        if (raced) {
          const updated = await this.prisma.userJoinRegionPreference.update({
            where: { id: raced.id },
            data: { label },
          });
          return this.toDto(updated);
        }
      }
      throw e;
    }
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const row = await this.prisma.userJoinRegionPreference.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'REGION_PREFERENCE_NOT_FOUND',
        message: '선호 지역을 찾을 수 없습니다.',
      });
    }
    await this.prisma.userJoinRegionPreference.delete({ where: { id: row.id } });
    return { ok: true };
  }

  private toDto(row: {
    id: string;
    sido: string;
    sigungu: string;
    label: string;
    sortOrder: number;
    createdAt: Date;
  }): UserJoinRegionPreferenceDto {
    return {
      id: row.id,
      sido: row.sido,
      sigungu: row.sigungu,
      label: row.label,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
