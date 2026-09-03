import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserAccountService } from './user-account.service';
import { MockMediaAdapter, MockIdentityAdapter } from '../../providers/mock.adapters';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [WalletModule, PaymentsModule],
  controllers: [UsersController],
  providers: [UsersService, UserAccountService, MockMediaAdapter, MockIdentityAdapter],
  exports: [UsersService, UserAccountService],
})
export class UsersModule {}
