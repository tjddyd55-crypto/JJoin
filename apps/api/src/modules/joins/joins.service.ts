import { Injectable } from '@nestjs/common';

@Injectable()
export class JoinsService {
  // Foundation skeleton — no business implementation yet.
  ping() {
    return { module: 'joins', status: 'skeleton' };
  }
}
