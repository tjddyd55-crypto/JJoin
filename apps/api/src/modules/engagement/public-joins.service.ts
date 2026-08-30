import { Injectable, NotFoundException } from '@nestjs/common';
import { isJoinCapacityJoinable } from '@jjoin/domain';
import type { JoinKind, JoinStatus, PublicJoinShareDto } from '@jjoin/types';
import { PrismaService } from '../../prisma/prisma.service';

const STATUS_LABEL: Record<string, string> = {
  OPEN: '모집 중',
  FULL: '모집 완료',
  CONFIRMED: '확정',
  IN_PROGRESS: '진행 중',
  CANCELLED: '취소됨',
  COMPLETED: '완료',
};

@Injectable()
export class PublicJoinsService {
  constructor(private readonly prisma: PrismaService) {}

  async getByShareSlug(shareSlug: string): Promise<PublicJoinShareDto> {
    const slug = shareSlug?.trim();
    if (!slug) {
      throw new NotFoundException({
        code: 'PUBLIC_JOIN_NOT_FOUND',
        message: '공유 조인을 찾을 수 없습니다.',
      });
    }

    const join = await this.prisma.join.findUnique({
      where: { shareSlug: slug },
      include: {
        venue: {
          include: {
            golfFacility: { select: { sido: true, sigungu: true } },
          },
        },
      },
    });
    if (!join) {
      throw new NotFoundException({
        code: 'PUBLIC_JOIN_NOT_FOUND',
        message: '공유 조인을 찾을 수 없습니다.',
      });
    }

    const availableSlots = Math.max(0, join.plannedPlayerCount - join.confirmedPlayerCount);
    const isJoinable = isJoinCapacityJoinable({
      status: join.status,
      currentParticipants: join.confirmedPlayerCount,
      maxParticipants: join.plannedPlayerCount,
    });

    const regionParts = [
      join.venue.golfFacility?.sido,
      join.venue.golfFacility?.sigungu,
    ].filter(Boolean);
    const regionLabel =
      regionParts.length > 0 ? regionParts.join(' ') : join.venue.region;

    const scheme =
      process.env.RAILWAY_ENVIRONMENT_NAME === 'production' ||
      process.env.APP_VARIANT === 'production'
        ? 'jjoin'
        : 'jjoindev';

    return {
      shareSlug: join.shareSlug!,
      status: join.status as JoinStatus,
      statusLabel: STATUS_LABEL[join.status] ?? join.status,
      venueName: join.venue.name,
      regionLabel,
      startAt: join.startAt.toISOString(),
      scheduledEndAt: join.scheduledEndAt.toISOString(),
      plannedPlayerCount: join.plannedPlayerCount,
      confirmedPlayerCount: join.confirmedPlayerCount,
      availableSlots,
      joinKind: join.joinKind as JoinKind,
      title: join.title,
      description: join.description,
      isJoinable,
      appDeepLink: `${scheme}://j/${join.shareSlug}`,
    };
  }
}
