import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/admin.guard';
import { ServiceOperatorProfileService } from './service-operator-profile.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminServiceOperatorController {
  constructor(private readonly operatorProfile: ServiceOperatorProfileService) {}

  @Get('service-operator-profile')
  getProfile() {
    return this.operatorProfile.getAdminProfile();
  }

  @Put('service-operator-profile')
  updateProfile(
    @Body() body: unknown,
    @Req() req: { userId?: string },
  ) {
    return this.operatorProfile.updateAdminProfile(body, req.userId);
  }
}
