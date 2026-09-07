import { Controller, Get } from '@nestjs/common';
import { MobileAndroidReleaseService } from './mobile-android-release.service';

@Controller()
export class PublicMobileAndroidReleaseController {
  constructor(private readonly mobileRelease: MobileAndroidReleaseService) {}

  @Get('public/mobile-release/android')
  getRelease() {
    return this.mobileRelease.getPublicRelease();
  }
}
