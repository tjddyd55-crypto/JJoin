import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';

@Controller()
export class WalletController {
  constructor(private readonly service: WalletService) {}

  @Get('wallet/_meta')
  meta() {
    return this.service.ping();
  }

  @UseGuards(MockAuthGuard)
  @Get('me/wallet')
  wallet(@CurrentUserId() userId: string) {
    return this.service.getSummary(userId);
  }

  @UseGuards(MockAuthGuard)
  @Get('me/wallet/transactions')
  transactions(
    @CurrentUserId() userId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listTransactions(userId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
