import { Controller, Get } from '@nestjs/common';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }
}
