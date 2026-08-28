import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminGuard } from '../../common/admin.guard';
import { MembershipService } from './membership.service';
import { MembershipController } from './membership.controller';
import { AdminMembershipController } from './admin-membership.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MembershipController, AdminMembershipController],
  providers: [MembershipService, AdminGuard],
  exports: [MembershipService],
})
export class MembershipModule {}
