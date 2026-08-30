import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { JoinBookmarksService } from './join-bookmarks.service';

@Controller()
@UseGuards(MockAuthGuard)
export class JoinBookmarksController {
  constructor(private readonly service: JoinBookmarksService) {}

  @Get('me/join-bookmarks')
  list(@CurrentUserId() userId: string) {
    return this.service.list(userId);
  }

  @Post('joins/:joinId/bookmark')
  add(@CurrentUserId() userId: string, @Param('joinId') joinId: string) {
    return this.service.add(userId, joinId);
  }

  @Delete('joins/:joinId/bookmark')
  remove(@CurrentUserId() userId: string, @Param('joinId') joinId: string) {
    return this.service.remove(userId, joinId);
  }
}
