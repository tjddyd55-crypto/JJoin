import { Controller, Get } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly service: WalletService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }
}
