import { Controller, Get, UseGuards } from '@nestjs/common';
import { MockAuthGuard } from '../../common/mock-auth.guard';
import { JoinDiscoveryService } from '../joins/join-discovery.service';

@Controller('regions')
export class RegionsController {
  constructor(private readonly discovery: JoinDiscoveryService) {}

  @Get('districts')
  @UseGuards(MockAuthGuard)
  districts() {
    return this.discovery.districtCatalog();
  }
}
