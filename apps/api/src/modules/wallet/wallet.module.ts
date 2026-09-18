import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { CoinLedgerService } from './coin-ledger.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [WalletController],
  providers: [WalletService, CoinLedgerService],
  exports: [WalletService, CoinLedgerService],
})
export class WalletModule {}
