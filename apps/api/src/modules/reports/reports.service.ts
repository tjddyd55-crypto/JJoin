import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportsService {
  // Foundation skeleton — no business implementation yet.
  ping() {
    return { module: 'reports', status: 'skeleton' };
  }
}
