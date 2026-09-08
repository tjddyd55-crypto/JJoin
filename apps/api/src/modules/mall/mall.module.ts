import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminMallController, MallController } from './mall.controller';
import { MallService } from './mall.service';

@Module({
  imports: [WalletModule, StorageModule],
  controllers: [MallController, AdminMallController],
  providers: [MallService],
  exports: [MallService],
})
export class MallModule {}
