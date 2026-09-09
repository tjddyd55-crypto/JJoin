import { Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get('_meta')
  meta() {
    return this.service.ping();
  }

  @Get('objects')
  async getObject(@Query('key') key: string | undefined, @Res() res: Response) {
    if (!key?.trim()) {
      throw new NotFoundException('media_not_found');
    }
    const { body, contentType } = await this.service.getPublicObject(key);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.send(body);
  }
}
