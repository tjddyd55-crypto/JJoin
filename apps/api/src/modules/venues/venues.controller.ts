import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { ActivateVenueRequest } from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { VenuesService } from './venues.service';

@Controller('venues')
export class VenuesController {
  constructor(private readonly service: VenuesService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }

  @Post('activate')
  @UseGuards(MockAuthGuard)
  activate(@CurrentUserId() userId: string, @Body() body: ActivateVenueRequest) {
    return this.service.activate(userId, body);
  }

  @Get(':venueId')
  @UseGuards(MockAuthGuard)
  getById(@Param('venueId') venueId: string) {
    return this.service.getById(venueId);
  }
}
