import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletService {
  // Foundation skeleton — no business implementation yet.
  ping() {
    return { module: 'wallet', status: 'skeleton' };
  }
}
