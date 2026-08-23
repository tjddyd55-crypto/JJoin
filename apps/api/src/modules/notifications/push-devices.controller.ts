import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { RegisterPushDeviceRequest } from '@jjoin/types';
import { PushDevicesService } from './push-devices.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller()
@UseGuards(MockAuthGuard)
export class PushDevicesController {
  constructor(private readonly devices: PushDevicesService) {}

  @Post('me/push-devices')
  register(@CurrentUserId() userId: string, @Body() body: RegisterPushDeviceRequest) {
    return this.devices.register(userId, body);
  }

  @Get('me/push-devices')
  list(@CurrentUserId() userId: string) {
    return this.devices.list(userId);
  }

  @Delete('me/push-devices/:id')
  deactivate(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.devices.deactivate(userId, id);
  }

  /** Logout / account-switch: deactivate current device token without exposing it in lists. */
  @Post('me/push-devices/deactivate-current')
  deactivateCurrent(
    @CurrentUserId() userId: string,
    @Body() body: { pushToken?: string },
  ) {
    return this.devices.deactivateByToken(userId, body.pushToken ?? '');
  }
}
