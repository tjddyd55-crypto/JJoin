import { Controller, Get } from '@nestjs/common';
import { ParticipationService } from './participation.service';

@Controller('participation')
export class ParticipationController {
  constructor(private readonly service: ParticipationService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }
}
