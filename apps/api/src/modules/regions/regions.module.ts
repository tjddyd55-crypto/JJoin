import { Module } from '@nestjs/common';
import { JoinsModule } from '../joins/joins.module';
import { RegionsController } from './regions.controller';

@Module({
  imports: [JoinsModule],
  controllers: [RegionsController],
})
export class RegionsModule {}
