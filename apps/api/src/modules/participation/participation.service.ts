import { Injectable } from '@nestjs/common';

@Injectable()
export class ParticipationService {
  // Foundation skeleton — no business implementation yet.
  ping() {
    return { module: 'participation', status: 'skeleton' };
  }
}
