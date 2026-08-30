import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import type { AdminStoreKpiPeriod } from '@jjoin/types';
import { StoreOwnershipService } from './store-ownership.service';
import { AdminGuard } from '../../common/admin.guard';

@Controller('admin/stores')
@UseGuards(AdminGuard)
export class AdminStoresController {
  constructor(private readonly service: StoreOwnershipService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('sido') sido?: string,
    @Query('period') period?: AdminStoreKpiPeriod,
  ) {
    return this.service.listAdminStores({ q, sido, period: period ?? 'all' });
  }

  @Get(':ownershipId')
  detail(
    @Param('ownershipId') ownershipId: string,
    @Query('period') period?: AdminStoreKpiPeriod,
  ) {
    return this.service.getAdminStoreDetail(ownershipId, period ?? 'all');
  }
}
