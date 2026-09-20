import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { AdminGuard } from '../../common/admin.guard';
import { FeatureFlagsService } from './feature-flags.service';
import { HomeBannersService } from './home-banners.service';
import { ProfileMatchService } from './profile-match.service';
import { RewardsService } from './rewards.service';
import { StoreBannerAdsService } from './store-banner-ads.service';
import { StoreProfilePhotoService } from './store-profile-photo.service';
import { StoreProfilesService } from './store-profiles.service';

type UploadedImageFile = {
  buffer: Buffer;
};

@Controller()
export class PublicExpansionController {
  constructor(
    private readonly flags: FeatureFlagsService,
    private readonly banners: HomeBannersService,
    private readonly stores: StoreProfilesService,
  ) {}

  @Get('feature-flags')
  featureFlags() {
    return this.flags.getFlags();
  }

  @Get('home-banners')
  homeBanners() {
    return this.banners.listPublic();
  }

  @Get('screen-stores')
  screenStores(@Query('sido') sido?: string, @Query('sigungu') sigungu?: string) {
    return this.stores.listPublic({ sido, sigungu });
  }

  @Get('screen-stores/:ownershipId')
  screenStoreDetail(@Param('ownershipId') ownershipId: string) {
    return this.stores.getPublicDetail(ownershipId);
  }
}

@Controller()
@UseGuards(MockAuthGuard)
export class MeExpansionController {
  constructor(
    private readonly profileMatch: ProfileMatchService,
    private readonly rewards: RewardsService,
    private readonly stores: StoreProfilesService,
    private readonly storePhotos: StoreProfilePhotoService,
    private readonly ads: StoreBannerAdsService,
  ) {}

  @Get('me/profile-match-preference')
  getMatchPref(@CurrentUserId() userId: string) {
    return this.profileMatch.getMine(userId);
  }

  @Put('me/profile-match-preference')
  putMatchPref(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.profileMatch.upsertMine(userId, body);
  }

  @Get('me/rewards/progress')
  progress(@CurrentUserId() userId: string) {
    return this.rewards.getProgress(userId);
  }

  @Get('me/rewards/history')
  history(@CurrentUserId() userId: string) {
    return this.rewards.listHistory(userId);
  }

  @Post('me/rewards/attendance/check-in')
  checkIn(@CurrentUserId() userId: string) {
    return this.rewards.checkIn(userId);
  }

  @Post('me/rewards/attendance/ping')
  pingAttendance(@CurrentUserId() userId: string) {
    return this.rewards.pingAttendance(userId);
  }

  @Get('me/stores/:ownershipId/profile')
  ownerProfile(@CurrentUserId() userId: string, @Param('ownershipId') ownershipId: string) {
    return this.stores.getOwnerProfile(userId, ownershipId);
  }

  @Put('me/stores/:ownershipId/profile')
  upsertOwnerProfile(
    @CurrentUserId() userId: string,
    @Param('ownershipId') ownershipId: string,
    @Body() body: unknown,
  ) {
    return this.stores.upsertOwnerProfile(userId, ownershipId, body);
  }

  @Post('me/stores/:ownershipId/profile/photos')
  @UseInterceptors(FileInterceptor('file'))
  uploadStorePhoto(
    @CurrentUserId() userId: string,
    @Param('ownershipId') ownershipId: string,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('file_required');
    }
    return this.storePhotos.addPhoto(userId, ownershipId, file.buffer);
  }

  @Delete('me/stores/:ownershipId/profile/photos/:photoId')
  deleteStorePhoto(
    @CurrentUserId() userId: string,
    @Param('ownershipId') ownershipId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.storePhotos.deletePhoto(userId, ownershipId, photoId);
  }

  @Patch('me/stores/:ownershipId/profile/photos/:photoId/cover')
  setStoreCoverPhoto(
    @CurrentUserId() userId: string,
    @Param('ownershipId') ownershipId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.storePhotos.setCoverPhoto(userId, ownershipId, photoId);
  }

  @Get('me/store-banner-ads')
  myAds(@CurrentUserId() userId: string) {
    return this.ads.listMine(userId);
  }

  @Post('me/store-banner-ads')
  createAd(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.ads.create(userId, body);
  }
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminExpansionController {
  constructor(
    private readonly flags: FeatureFlagsService,
    private readonly banners: HomeBannersService,
    private readonly rewards: RewardsService,
    private readonly ads: StoreBannerAdsService,
    private readonly stores: StoreProfilesService,
  ) {}

  @Get('feature-flags')
  getFlags() {
    return this.flags.getFlags();
  }

  @Put('feature-flags')
  updateFlags(@Body() body: unknown, @Req() req: Request) {
    return this.flags.updateFlags(body, (req as Request & { userId?: string }).userId);
  }

  @Get('reward-policy')
  getRewardPolicy() {
    return this.rewards.getPolicy();
  }

  @Put('reward-policy')
  updateRewardPolicy(@Body() body: unknown, @Req() req: Request) {
    return this.rewards.updatePolicy(body, (req as Request & { userId?: string }).userId);
  }

  @Get('home-banners')
  listBanners() {
    return this.banners.listAdmin();
  }

  @Post('home-banners')
  createBanner(@Body() body: unknown, @Req() req: Request) {
    return this.banners.upsert(null, body, (req as Request & { userId?: string }).userId);
  }

  @Put('home-banners/:id')
  updateBanner(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    return this.banners.upsert(id, body, (req as Request & { userId?: string }).userId);
  }

  @Delete('home-banners/:id')
  deleteBanner(@Param('id') id: string) {
    return this.banners.remove(id);
  }

  @Get('store-banner-ads')
  listAds() {
    return this.ads.listAdmin();
  }

  @Post('store-banner-ads/:id/review')
  reviewAd(@Param('id') id: string, @Body() body: unknown, @Req() req: Request) {
    return this.ads.review((req as Request & { userId?: string }).userId ?? '', id, body);
  }

  @Post('store-banner-ads/:id/schedule')
  scheduleAd(@Param('id') id: string, @Body() body: unknown) {
    return this.ads.schedule(id, body);
  }

  @Get('stores/:ownershipId/profile')
  getAdminStoreProfile(
    @Param('ownershipId') ownershipId: string,
    @Req() req: Request,
  ) {
    return this.stores.getOwnerProfile(
      (req as Request & { userId?: string }).userId ?? '',
      ownershipId,
    );
  }

  @Put('stores/:ownershipId/profile')
  adminStoreProfile(
    @Param('ownershipId') ownershipId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    return this.stores.upsertOwnerProfile(
      (req as Request & { userId?: string }).userId ?? '',
      ownershipId,
      body,
    );
  }
}
