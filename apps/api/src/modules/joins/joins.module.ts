import { Module } from '@nestjs/common';
import { JoinsController } from './joins.controller';
import { JoinsService } from './joins.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [JoinsController],
  providers: [JoinsService],
  exports: [JoinsService],
})
export class JoinsModule {}
