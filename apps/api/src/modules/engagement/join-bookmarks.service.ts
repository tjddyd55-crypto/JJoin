import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { JoinBookmarkDto } from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { JoinsService } from '../joins/joins.service';

@Injectable()
export class JoinBookmarksService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => JoinsService))
    private readonly joins: JoinsService,
  ) {}

  async list(userId: string): Promise<JoinBookmarkDto[]> {
    const rows = await this.prisma.joinBookmark.findMany({
      where: { userId },
      include: {
        join: {
          include: {
            venue: true,
            host: { include: { profile: true } },
            participants: {
              include: { user: { include: { profile: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      joinId: row.joinId,
      createdAt: row.createdAt.toISOString(),
      join: this.joins.toListItemPublic(row.join, userId),
    }));
  }

  async add(userId: string, joinId: string): Promise<JoinBookmarkDto> {
    const join = await this.prisma.join.findUnique({
      where: { id: joinId },
      include: {
        venue: true,
        host: { include: { profile: true } },
        participants: {
          include: { user: { include: { profile: true } } },
        },
      },
    });
    if (!join) {
      throw new NotFoundException({ code: 'JOIN_NOT_FOUND', message: '조인을 찾을 수 없습니다.' });
    }

    try {
      const row = await this.prisma.joinBookmark.create({
        data: { userId, joinId },
      });
      return {
        id: row.id,
        joinId: row.joinId,
        createdAt: row.createdAt.toISOString(),
        join: this.joins.toListItemPublic(join, userId),
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          code: 'JOIN_ALREADY_BOOKMARKED',
          message: '이미 북마크한 조인입니다.',
        });
      }
      throw e;
    }
  }

  async remove(userId: string, joinId: string): Promise<{ ok: true }> {
    const existing = await this.prisma.joinBookmark.findUnique({
      where: { userId_joinId: { userId, joinId } },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'JOIN_BOOKMARK_NOT_FOUND',
        message: '북마크가 없습니다.',
      });
    }
    await this.prisma.joinBookmark.delete({ where: { id: existing.id } });
    return { ok: true };
  }
}
