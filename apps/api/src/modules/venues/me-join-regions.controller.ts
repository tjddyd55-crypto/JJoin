import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { UpsertUserJoinRegionPreferenceRequest } from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { MeJoinRegionsService } from './me-join-regions.service';

@Controller('me/join-regions')
@UseGuards(MockAuthGuard)
export class MeJoinRegionsController {
  constructor(private readonly service: MeJoinRegionsService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.service.list(userId);
  }

  @Post()
  upsert(
    @CurrentUserId() userId: string,
    @Body() body: UpsertUserJoinRegionPreferenceRequest,
  ) {
    return this.service.upsert(userId, body);
  }

  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }
}
