import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { CreateJoinRequest, JoinCoinPreviewRequest } from '@jjoin/types';
import { JoinsService } from './joins.service';
import { JoinDiscoveryService } from './join-discovery.service';
import { MatchingJoinsService } from './matching-joins.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller('joins')
export class JoinsController {
  constructor(
    private readonly service: JoinsService,
    private readonly discovery: JoinDiscoveryService,
    private readonly matchingJoins: MatchingJoinsService,
  ) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }

  @Post('coin-preview')
  @UseGuards(MockAuthGuard)
  coinPreview(@CurrentUserId() userId: string, @Body() body: JoinCoinPreviewRequest) {
    return this.service.previewCoin(userId, body);
  }

  @Post()
  @UseGuards(MockAuthGuard)
  create(@CurrentUserId() userId: string, @Body() body: CreateJoinRequest) {
    return this.service.create(userId, body);
  }

  @Get('mine')
  @UseGuards(MockAuthGuard)
  mine(@CurrentUserId() userId: string) {
    return this.service.myJoins(userId);
  }

  /** Must be registered before `@Get(':joinId')`. */
  @Get('discover')
  @UseGuards(MockAuthGuard)
  async discover(
    @CurrentUserId() userId: string,
    @Query('date') date?: string,
    @Query('regionMode') regionMode?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusMeters') radiusMeters?: string,
    @Query('sido') sido?: string,
    @Query('sigungu') sigungu?: string,
    @Query('sort') sort?: string,
    @Query('joinability') joinability?: string,
  ) {
    await this.matchingJoins.reconcileDueMatchingDeadlines(20);
    return this.discovery.discover(userId, {
      date,
      regionMode,
      lat: optionalNum(lat),
      lng: optionalNum(lng),
      radiusMeters: optionalNum(radiusMeters),
      sido,
      sigungu,
      sort,
      joinability,
    });
  }

  @Get('discover/weekly')
  @UseGuards(MockAuthGuard)
  discoverWeekly(
    @CurrentUserId() userId: string,
    @Query('weekStart') weekStart?: string,
    @Query('date') date?: string,
    @Query('regionMode') regionMode?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusMeters') radiusMeters?: string,
    @Query('sido') sido?: string,
    @Query('sigungu') sigungu?: string,
  ) {
    return this.discovery.weeklyCounts(userId, {
      weekStart,
      date,
      regionMode,
      lat: optionalNum(lat),
      lng: optionalNum(lng),
      radiusMeters: optionalNum(radiusMeters),
      sido,
      sigungu,
    });
  }

  @Get('discover/region-summary')
  @UseGuards(MockAuthGuard)
  discoverRegionSummary(
    @CurrentUserId() userId: string,
    @Query('date') date?: string,
    @Query('joinability') joinability?: string,
    @Query('sido') sido?: string,
    @Query('sigungu') sigungu?: string,
  ) {
    return this.discovery.regionSummary(userId, {
      date,
      joinability,
      sido,
      sigungu,
    });
  }

  @Get('discover/facilities')
  @UseGuards(MockAuthGuard)
  async discoverFacilities(
    @CurrentUserId() userId: string,
    @Query('date') date?: string,
    @Query('joinability') joinability?: string,
    @Query('regionMode') regionMode?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusMeters') radiusMeters?: string,
    @Query('sido') sido?: string,
    @Query('sigungu') sigungu?: string,
    @Query('sort') sort?: string,
  ) {
    await this.matchingJoins.reconcileDueMatchingDeadlines(20);
    return this.discovery.facilityJoins(userId, {
      date,
      joinability,
      regionMode,
      lat: optionalNum(lat),
      lng: optionalNum(lng),
      radiusMeters: optionalNum(radiusMeters),
      sido,
      sigungu,
      sort,
    });
  }

  @Get(':joinId/prefill')
  @UseGuards(MockAuthGuard)
  prefill(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.getPrefill(joinId, userId);
  }

  /** Lazy-create opaque share slug for existing joins (shareSlug may be null). */
  @Post(':joinId/share-link')
  @UseGuards(MockAuthGuard)
  async shareLink(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    await this.service.getDetail(joinId, userId);
    const shareSlug = await this.service.ensureShareSlug(joinId);
    return { shareSlug };
  }

  /** Resolve public share slug → joinId for authenticated deep-link open. */
  @Get('by-share/:shareSlug')
  @UseGuards(MockAuthGuard)
  resolveShare(@Param('shareSlug') shareSlug: string) {
    return this.service.resolveShareSlug(shareSlug);
  }

  @Get(':joinId')
  @UseGuards(MockAuthGuard)
  detail(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.getDetail(joinId, userId);
  }

  @Post(':joinId/apply')
  @UseGuards(MockAuthGuard)
  apply(@Param('joinId') joinId: string, @CurrentUserId() userId: string) {
    return this.service.apply(joinId, userId);
  }

  @Post(':joinId/participants/:participantId/approve')
  @UseGuards(MockAuthGuard)
  approve(
    @Param('joinId') joinId: string,
    @Param('participantId') participantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.service.approve(joinId, participantId, userId);
  }
}

function optionalNum(value?: string): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
