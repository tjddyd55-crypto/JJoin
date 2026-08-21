import { Module } from '@nestjs/common';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';
import { JoinsModule } from '../joins/joins.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [JoinsModule, PresenceModule],
  controllers: [ExploreController],
  providers: [ExploreService],
  exports: [ExploreService],
})
export class ExploreModule {}
