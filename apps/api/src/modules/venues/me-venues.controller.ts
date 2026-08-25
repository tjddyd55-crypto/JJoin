import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type {
  AddUserVenueFavoriteRequest,
  CreateCustomVenueRequest,
} from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { MeVenuesService } from './me-venues.service';

@Controller('me/venues')
@UseGuards(MockAuthGuard)
export class MeVenuesController {
  constructor(private readonly service: MeVenuesService) {}

  @Get('recent')
  listRecent(@CurrentUserId() userId: string) {
    return this.service.listRecent(userId);
  }

  @Get('favorites')
  listFavorites(@CurrentUserId() userId: string) {
    return this.service.listFavorites(userId);
  }

  @Post('favorites')
  addFavorite(
    @CurrentUserId() userId: string,
    @Body() body: AddUserVenueFavoriteRequest,
  ) {
    return this.service.addFavorite(userId, body);
  }

  @Delete('favorites/:venueId')
  removeFavorite(
    @CurrentUserId() userId: string,
    @Param('venueId') venueId: string,
  ) {
    return this.service.removeFavorite(userId, venueId);
  }

  @Post('custom')
  createCustom(
    @CurrentUserId() userId: string,
    @Body() body: CreateCustomVenueRequest,
  ) {
    return this.service.createCustomVenue(userId, body);
  }
}
