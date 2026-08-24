import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  CoinIssuanceType,
  type AdminManualIssuanceRequest,
} from '@jjoin/types';
import { AdminGuard } from '../../common/admin.guard';
import { CurrentUserId } from '../../common/mock-auth.guard';
import { AdminCoinSupplyService } from './admin-coin-supply.service';

@Controller('admin/coin')
@UseGuards(AdminGuard)
export class AdminCoinSupplyController {
  constructor(private readonly service: AdminCoinSupplyService) {}

  @Get('supply')
  supply(@Query('excludeDevSeed') excludeDevSeed?: string) {
    return this.service.getDashboard({
      excludeDevSeed: excludeDevSeed === '1' || excludeDevSeed === 'true',
    });
  }

  @Get('supply/reconcile')
  reconcile(@Query('excludeDevSeed') excludeDevSeed?: string) {
    return this.service.reconcile({
      excludeDevSeed: excludeDevSeed === '1' || excludeDevSeed === 'true',
    });
  }

  @Get('issuances')
  listIssuances(
    @Query('issuanceType') issuanceType?: CoinIssuanceType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
    @Query('excludeDevSeed') excludeDevSeed?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listIssuances({
      issuanceType,
      from,
      to,
      userId,
      excludeDevSeed: excludeDevSeed === '1' || excludeDevSeed === 'true',
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('issuances/:issuanceId')
  getIssuance(@Param('issuanceId') issuanceId: string) {
    return this.service.getIssuance(issuanceId);
  }

  @Post('issuances')
  manualIssue(
    @CurrentUserId() adminUserId: string,
    @Body() body: AdminManualIssuanceRequest,
  ) {
    return this.service.manualIssue(adminUserId, body);
  }

  @Get('users/:userId')
  userCoinHistory(@Param('userId') userId: string) {
    return this.service.getUserCoinHistory(userId);
  }
}
