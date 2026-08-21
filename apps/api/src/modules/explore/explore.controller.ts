import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { ExploreFilter } from '@jjoin/types';
import { MockAuthGuard } from '../../common/mock-auth.guard';
import { ExploreService } from './explore.service';
import { mockUserStore } from '../../mock/mock-user.store';

@Controller('explore')
export class ExploreController {
  constructor(private readonly explore: ExploreService) {}

  @Get('map')
  @UseGuards(MockAuthGuard)
  getMap(
    @Req() req: { headers: { authorization?: string }; userId?: string },
    @Query('sportCode') sportCode?: string,
    @Query('filter') filter?: ExploreFilter,
    @Query('centerLat') centerLat?: string,
    @Query('centerLng') centerLng?: string,
    @Query('southWestLat') southWestLat?: string,
    @Query('southWestLng') southWestLng?: string,
    @Query('northEastLat') northEastLat?: string,
    @Query('northEastLng') northEastLng?: string,
  ) {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;
    const viewerUserId = req.userId ?? mockUserStore.getUserIdByToken(token) ?? undefined;

    return this.explore.getMap({
      sportCode,
      filter,
      centerLat: num(centerLat),
      centerLng: num(centerLng),
      southWestLat: num(southWestLat),
      southWestLng: num(southWestLng),
      northEastLat: num(northEastLat),
      northEastLng: num(northEastLng),
      viewerUserId: viewerUserId ?? undefined,
    });
  }
}

function num(value?: string): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
