import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminGuard } from '../../common/admin.guard';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { DirectMessagesService } from './direct-messages.service';
import { MessagePolicyService } from './message-policy.service';

@Controller()
export class PublicMessagePolicyController {
  constructor(private readonly policy: MessagePolicyService) {}

  @Get('message-policy')
  getPolicy() {
    return this.policy.getPolicy();
  }
}

@Controller()
@UseGuards(MockAuthGuard)
export class MeDirectMessagesController {
  constructor(private readonly messages: DirectMessagesService) {}

  @Get('me/messages/unread-count')
  unreadCount(@CurrentUserId() userId: string) {
    return this.messages.unreadCount(userId);
  }

  @Get('me/messages/conversations')
  list(@CurrentUserId() userId: string) {
    return this.messages.listConversations(userId);
  }

  @Post('me/messages/conversations')
  create(@CurrentUserId() userId: string, @Body() body: CreateConversationBody) {
    return this.messages.getOrCreateConversation(userId, body);
  }

  @Get('me/messages/conversations/:id')
  getOne(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.messages.getConversation(userId, id);
  }

  @Get('me/messages/conversations/:id/messages')
  listMessages(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messages.listMessages(userId, id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('me/messages/conversations/:id/messages')
  postMessage(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.messages.postMessage(userId, id, body);
  }

  @Post('me/messages/conversations/:id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.messages.markRead(userId, id);
  }
}

type CreateConversationBody = { peerUserId?: string };

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminMessagePolicyController {
  constructor(private readonly policy: MessagePolicyService) {}

  @Get('message-policy')
  getPolicy() {
    return this.policy.getPolicy();
  }

  @Put('message-policy')
  updatePolicy(@Body() body: unknown, @Req() req: Request) {
    return this.policy.updatePolicy(body, (req as Request & { userId?: string }).userId);
  }
}
