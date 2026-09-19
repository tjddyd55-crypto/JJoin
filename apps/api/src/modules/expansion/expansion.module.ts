import { Module } from '@nestjs/common';
import { AdminGuard } from '../../common/admin.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { StorageModule } from '../storage/storage.module';
import { WalletModule } from '../wallet/wallet.module';
import {
  AdminExpansionController,
  MeExpansionController,
  PublicExpansionController,
} from './expansion.controllers';
import { FeatureFlagsService } from './feature-flags.service';
import { HomeBannersService } from './home-banners.service';
import { ProfileMatchService } from './profile-match.service';
import { RewardsService } from './rewards.service';
import { StoreBannerAdsService } from './store-banner-ads.service';
import { StoreProfilePhotoService } from './store-profile-photo.service';
import { StoreProfilesService } from './store-profiles.service';

@Module({
  imports: [WalletModule, NotificationsModule, PaymentsModule, StorageModule],
  controllers: [PublicExpansionController, MeExpansionController, AdminExpansionController],
  providers: [
    FeatureFlagsService,
    HomeBannersService,
    ProfileMatchService,
    StoreProfilesService,
    StoreProfilePhotoService,
    StoreBannerAdsService,
    RewardsService,
    AdminGuard,
  ],
  exports: [FeatureFlagsService, ProfileMatchService, RewardsService],
})
export class ExpansionModule {}
