import { Controller, Get } from '@nestjs/common';
import { JoinsService } from './joins.service';

@Controller('joins')
export class JoinsController {
  constructor(private readonly service: JoinsService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }
}
