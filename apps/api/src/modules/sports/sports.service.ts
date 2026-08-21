import { Injectable } from '@nestjs/common';

@Injectable()
export class SportsService {
  // Foundation skeleton — no business implementation yet.
  ping() {
    return { module: 'sports', status: 'skeleton' };
  }
}
