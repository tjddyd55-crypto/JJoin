import { Controller, Get } from '@nestjs/common';
import { ServiceOperatorProfileService } from './service-operator-profile.service';

@Controller()
export class PublicServiceOperatorController {
  constructor(private readonly operatorProfile: ServiceOperatorProfileService) {}

  @Get('public/service-operator-profile')
  getProfile() {
    return this.operatorProfile.getPublicProfile();
  }
}
