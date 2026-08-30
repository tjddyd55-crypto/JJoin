import { Controller, Get, Param } from '@nestjs/common';
import { PublicJoinsService } from './public-joins.service';

/** Unauthenticated public share landing payload. */
@Controller('public/joins')
export class PublicJoinsController {
  constructor(private readonly service: PublicJoinsService) {}

  @Get(':shareSlug')
  getByShareSlug(@Param('shareSlug') shareSlug: string) {
    return this.service.getByShareSlug(shareSlug);
  }
}
