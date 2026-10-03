import { Controller, Delete, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { JoinSessionReviewDto } from '@jjoin/types';
import { AdminGuard } from '../../common/admin.guard';
import { JoinSessionReviewService } from './join-session-review.service';

@Controller('admin/join-session-reviews')
@UseGuards(AdminGuard)
export class JoinSessionReviewAdminController {
  constructor(private readonly sessionReviews: JoinSessionReviewService) {}

  @Get()
  list(@Query('limit') limit?: string): Promise<JoinSessionReviewDto[]> {
    const parsed = limit ? Number.parseInt(limit, 10) : 50;
    return this.sessionReviews.listAdmin(Number.isFinite(parsed) ? parsed : 50);
  }

  @Delete(':reviewId')
  delete(@Param('reviewId') reviewId: string, @Req() req: Request): Promise<void> {
    return this.sessionReviews.deleteReviewAsAdmin(
      reviewId,
      (req as Request & { userId?: string }).userId ?? 'admin',
    );
  }
}
