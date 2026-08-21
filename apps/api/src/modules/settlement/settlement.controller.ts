import { Controller, Get } from '@nestjs/common';
import { SettlementService } from './settlement.service';

@Controller('settlement')
export class SettlementController {
  constructor(private readonly service: SettlementService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }
}
