import { Module } from '@nestjs/common';
import { JoinsController } from './joins.controller';
import { JoinsService } from './joins.service';

@Module({
  controllers: [JoinsController],
  providers: [JoinsService],
  exports: [JoinsService],
})
export class JoinsModule {}
