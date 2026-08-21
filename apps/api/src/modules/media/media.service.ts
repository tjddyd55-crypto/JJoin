import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaService {
  // Foundation skeleton — no business implementation yet.
  ping() {
    return { module: 'media', status: 'skeleton' };
  }
}
