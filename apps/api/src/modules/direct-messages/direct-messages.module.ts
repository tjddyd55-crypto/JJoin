import { Module } from '@nestjs/common';
import { AdminGuard } from '../../common/admin.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import {
  AdminMessagePolicyController,
  MeDirectMessagesController,
  PublicMessagePolicyController,
} from './direct-messages.controller';
import { DirectMessagesService } from './direct-messages.service';
import { MessagePolicyService } from './message-policy.service';

@Module({
  imports: [WalletModule, NotificationsModule, PaymentsModule, UsersModule],
  controllers: [
    PublicMessagePolicyController,
    MeDirectMessagesController,
    AdminMessagePolicyController,
  ],
  providers: [MessagePolicyService, DirectMessagesService, AdminGuard],
  exports: [MessagePolicyService, DirectMessagesService],
})
export class DirectMessagesModule {}
