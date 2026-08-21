import { Injectable } from '@nestjs/common';

@Injectable()
export class VenuesService {
  // Foundation skeleton — no business implementation yet.
  ping() {
    return { module: 'venues', status: 'skeleton' };
  }
}
