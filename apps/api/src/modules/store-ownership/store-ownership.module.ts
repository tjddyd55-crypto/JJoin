import { Module, forwardRef } from '@nestjs/common';
import { StoreOwnershipController } from './store-ownership.controller';
import { AdminStoreOwnershipController } from './admin-store-ownership.controller';
import { AdminStoresController } from './admin-stores.controller';
import { StoreOwnershipService } from './store-ownership.service';
import { GolfFacilitiesModule } from '../golf-facilities/golf-facilities.module';
import { WalletModule } from '../wallet/wallet.module';
import { JoinsModule } from '../joins/joins.module';
import { AdminGuard } from '../../common/admin.guard';

@Module({
  imports: [GolfFacilitiesModule, WalletModule, forwardRef(() => JoinsModule)],
  controllers: [StoreOwnershipController, AdminStoreOwnershipController, AdminStoresController],
  providers: [StoreOwnershipService, AdminGuard],
  exports: [StoreOwnershipService],
})
export class StoreOwnershipModule {}
