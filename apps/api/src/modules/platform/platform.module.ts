import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminMobileAndroidReleaseController } from './admin-mobile-android-release.controller';
import { AdminServiceOperatorController } from './admin-service-operator.controller';
import { MobileAndroidReleaseService } from './mobile-android-release.service';
import { PublicMobileAndroidReleaseController } from './public-mobile-android-release.controller';
import { PublicServiceOperatorController } from './public-service-operator.controller';
import { ServiceOperatorProfileService } from './service-operator-profile.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    PublicServiceOperatorController,
    AdminServiceOperatorController,
    PublicMobileAndroidReleaseController,
    AdminMobileAndroidReleaseController,
  ],
  providers: [ServiceOperatorProfileService, MobileAndroidReleaseService],
  exports: [ServiceOperatorProfileService, MobileAndroidReleaseService],
})
export class PlatformModule {}
