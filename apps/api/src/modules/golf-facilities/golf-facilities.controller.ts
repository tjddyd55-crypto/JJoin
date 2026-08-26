import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { GolfFacilitiesService } from './golf-facilities.service';

@Controller('golf-facilities')
export class GolfFacilitiesController {
  constructor(private readonly service: GolfFacilitiesService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }

  /**
   * Viewport markers — eligible + VALID only. No Venue side effects.
   * Auth matches explore/map policy.
   */
  @Get()
  @UseGuards(MockAuthGuard)
  listInBounds(
    @Query('north') north?: string,
    @Query('south') south?: string,
    @Query('east') east?: string,
    @Query('west') west?: string,
    @Query('limit') limit?: string,
    @Query('date') date?: string,
    @Query('regionMode') regionMode?: string,
    @Query('sido') sido?: string,
    @Query('sigungu') sigungu?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusMeters') radiusMeters?: string,
  ) {
    const mode =
      regionMode === 'NEARBY' || regionMode === 'DISTRICT'
        ? regionMode
        : undefined;
    return this.service.listInBounds({
      north: requireNum(north, 'north'),
      south: requireNum(south, 'south'),
      east: requireNum(east, 'east'),
      west: requireNum(west, 'west'),
      limit: optionalInt(limit),
      date,
      regionMode: mode,
      sido,
      sigungu,
      lat: optionalFloat(lat),
      lng: optionalFloat(lng),
      radiusMeters: optionalFloat(radiusMeters),
    });
  }

  /**
   * Text GolfFacility master (not NAVER/Kakao Places as SoT).
   * No Venue side effects.
   */
  @Get('search')
  @UseGuards(MockAuthGuard)
  search(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.search({
      q: q ?? '',
      limit: optionalInt(limit),
      cursor,
    });
  }

  /** Read-only projection — no Venue side effects. */
  @Get(':id')
  @UseGuards(MockAuthGuard)
  getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  /**
   * Explicit lazy activation for Join use.
   * Listing/map/search reads must not call this.
   */
  @Post(':id/activate-venue')
  @UseGuards(MockAuthGuard)
  activateVenue(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.activateVenue(userId, id);
  }
}

function requireNum(value: string | undefined, name: string): number {
  if (value == null || value === '') {
    throw badBounds(name);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw badBounds(name);
  return n;
}

function optionalInt(value?: string): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}

function optionalFloat(value?: string): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function badBounds(name: string): never {
  throw new BadRequestException({
    code: 'INVALID_BOUNDS',
    message: `지도 조회 범위가 올바르지 않습니다. (${name})`,
  });
}
