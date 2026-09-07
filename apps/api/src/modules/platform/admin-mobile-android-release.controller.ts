import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/admin.guard';
import { MobileAndroidReleaseService } from './mobile-android-release.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminMobileAndroidReleaseController {
  constructor(private readonly mobileRelease: MobileAndroidReleaseService) {}

  @Get('mobile-release/android')
  getRelease() {
    return this.mobileRelease.getAdminRelease();
  }

  @Put('mobile-release/android')
  updateRelease(@Body() body: unknown, @Req() req: { userId?: string }) {
    return this.mobileRelease.updateAdminRelease(body, req.userId);
  }
}
