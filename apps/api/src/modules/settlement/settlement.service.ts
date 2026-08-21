import { Injectable } from '@nestjs/common';

@Injectable()
export class SettlementService {
  // Foundation skeleton — no business implementation yet.
  ping() {
    return { module: 'settlement', status: 'skeleton' };
  }
}
