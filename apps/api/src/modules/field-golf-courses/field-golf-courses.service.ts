import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  formatFieldCourseRegionLabel,
  formatFieldCourseShortAddress,
  hasValidKoreaMapCoords,
  listSidoSpellings,
  matchesFieldCityCounty,
  normalizeFieldCityCounty,
  normalizeFieldGolfSearchQuery,
} from '@jjoin/domain';
import {
  ODCLOUD_FIELD_GOLF_VENUE_PROVIDER,
  VenueType,
  type ActivateFieldGolfCourseVenueResponse,
  type FieldGolfCourseDto,
  type FieldGolfCourseSearchResponse,
} from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFoundation } from '../../foundation/ensure-foundation';

const MISSING_COORD = new Prisma.Decimal(0);

type CourseRow = {
  id: string;
  name: string;
  address: string | null;
  roadAddress: string | null;
  sido: string | null;
  sigungu: string | null;
  holeCount: number | null;
  status: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  venue: { id: string } | null;
};

@Injectable()
export class FieldGolfCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  ping() {
    return { module: 'field-golf-courses', status: 'ready', venueType: VenueType.FIELD };
  }

  async search(input: {
    name?: string;
    sido?: string;
    sigungu?: string;
    page?: number;
    perPage?: number;
  }): Promise<FieldGolfCourseSearchResponse> {
    const query = normalizeFieldGolfSearchQuery(input);
    const target = normalizeFieldCityCounty(query.sido, query.sigungu);
    const sidoVariants = target.province ? listSidoSpellings(target.province) : [];
    const where: Prisma.FieldGolfCourseWhereInput = {
      isActive: true,
      ...(query.name
        ? {
            OR: [
              { name: { contains: query.name, mode: 'insensitive' } },
              { normalizedName: { contains: query.name.replace(/\s+/g, '').toLowerCase() } },
            ],
          }
        : {}),
      ...(sidoVariants.length > 0 ? { sido: { in: sidoVariants } } : {}),
    };

    const [totalCountAll, rows] = await Promise.all([
      this.prisma.fieldGolfCourse.count({ where }),
      this.prisma.fieldGolfCourse.findMany({
        where,
        orderBy: [{ sido: 'asc' }, { name: 'asc' }],
        include: { venue: { select: { id: true } } },
      }),
    ]);

    const filtered = target.cityCounty
      ? rows.filter((row) =>
          matchesFieldCityCounty({
            rowSido: row.sido,
            rowSigungu: row.sigungu,
            targetProvince: target.province ?? '',
            targetCityCounty: target.cityCounty ?? '',
          }),
        )
      : rows;
    const totalCount = target.cityCounty ? filtered.length : totalCountAll;
    const pageRows = filtered.slice(query.skip, query.skip + query.perPage);

    return {
      items: pageRows.map((row) => this.toDto(row)),
      page: query.page,
      perPage: query.perPage,
      totalCount,
    };
  }

  /**
   * Lazy-activate a FIELD Venue from FieldGolfCourse.
   * Coordinates are optional — map is a graceful fallback, not a create blocker.
   */
  async activateVenue(
    userId: string,
    fieldGolfCourseId: string,
  ): Promise<ActivateFieldGolfCourseVenueResponse> {
    const course = await this.prisma.fieldGolfCourse.findUnique({
      where: { id: fieldGolfCourseId },
    });
    if (!course) {
      throw new NotFoundException({
        code: 'FIELD_COURSE_NOT_FOUND',
        message: '골프장을 찾을 수 없습니다.',
      });
    }
    if (!course.isActive) {
      throw new BadRequestException({
        code: 'FIELD_COURSE_INACTIVE',
        message: '조인 장소로 활성화할 수 없는 골프장입니다.',
      });
    }

    const provider = ODCLOUD_FIELD_GOLF_VENUE_PROVIDER;
    const providerPlaceId = course.externalId;
    const existing = await this.prisma.venue.findFirst({
      where: {
        OR: [
          { fieldGolfCourseId: course.id },
          { provider, providerPlaceId },
        ],
      },
    });
    if (existing) {
      if (existing.venueType !== 'FIELD') {
        await this.prisma.venue.update({
          where: { id: existing.id },
          data: { venueType: 'FIELD', fieldGolfCourseId: course.id },
        });
      }
      return {
        fieldGolfCourseId: course.id,
        venueId: existing.id,
        venueType: VenueType.FIELD,
        created: false,
      };
    }

    const { sport } = await ensureFoundation(this.prisma);
    const lat = course.latitude ?? MISSING_COORD;
    const lng = course.longitude ?? MISSING_COORD;
    try {
      const created = await this.prisma.venue.create({
        data: {
          sportId: sport.id,
          provider,
          providerPlaceId,
          fieldGolfCourseId: course.id,
          venueType: 'FIELD',
          name: course.name,
          address: course.roadAddress || course.address,
          roadAddress: course.roadAddress,
          phone: course.phone,
          latitude: lat,
          longitude: lng,
          region: [course.sido, course.sigungu].filter(Boolean).join(' ') || course.sido,
          metadata: {
            status: 'ACTIVE',
            activatedAt: new Date().toISOString(),
            activatedByUserId: userId,
            activationSource: 'FIELD_GOLF_COURSE',
            fieldGolfCourseId: course.id,
            coordinateStatus: hasValidKoreaMapCoords(
              course.latitude == null ? null : Number(course.latitude),
              course.longitude == null ? null : Number(course.longitude),
            )
              ? 'VALID'
              : 'MISSING',
          } as Prisma.InputJsonValue,
        },
      });
      return {
        fieldGolfCourseId: course.id,
        venueId: created.id,
        venueType: VenueType.FIELD,
        created: true,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const raced = await this.prisma.venue.findFirst({
          where: {
            OR: [
              { fieldGolfCourseId: course.id },
              { provider, providerPlaceId },
            ],
          },
        });
        if (raced) {
          return {
            fieldGolfCourseId: course.id,
            venueId: raced.id,
            venueType: VenueType.FIELD,
            created: false,
          };
        }
        throw new ConflictException({
          code: 'VENUE_CONFLICT',
          message: '장소 활성화 중 충돌이 발생했습니다. 다시 시도해 주세요.',
        });
      }
      throw e;
    }
  }

  private toDto(row: CourseRow): FieldGolfCourseDto {
    const latitude = row.latitude == null ? null : Number(row.latitude);
    const longitude = row.longitude == null ? null : Number(row.longitude);
    const normalized = normalizeFieldCityCounty(row.sido, row.sigungu);
    const cityCounty = normalized.cityCounty;
    const shortAddress = formatFieldCourseShortAddress(row.roadAddress ?? row.address);
    const regionLabel =
      formatFieldCourseRegionLabel({ sido: row.sido, sigungu: row.sigungu }) ??
      ([row.sido, row.sigungu].filter(Boolean).join(' ') || null);
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      roadAddress: row.roadAddress,
      sido: row.sido,
      sigungu: row.sigungu,
      cityCounty,
      shortAddress,
      regionLabel,
      holeCount: row.holeCount,
      status: row.status,
      latitude,
      longitude,
      hasMapCoords: hasValidKoreaMapCoords(latitude, longitude),
      venueId: row.venue?.id ?? null,
    };
  }
}
