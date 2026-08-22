import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MockMediaAdapter } from '../../providers/mock.adapters';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [UsersController],
  providers: [UsersService, MockMediaAdapter],
})
export class UsersModule {}
