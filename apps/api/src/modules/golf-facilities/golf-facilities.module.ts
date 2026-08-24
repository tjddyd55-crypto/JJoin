import { Module } from '@nestjs/common';
import { GolfFacilitiesController } from './golf-facilities.controller';
import { GolfFacilitiesService } from './golf-facilities.service';

@Module({
  controllers: [GolfFacilitiesController],
  providers: [GolfFacilitiesService],
  exports: [GolfFacilitiesService],
})
export class GolfFacilitiesModule {}
