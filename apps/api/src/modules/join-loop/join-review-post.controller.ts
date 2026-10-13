import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type {
  JoinReviewPostDetailDto,
  JoinReviewPostListResponseDto,
} from '@jjoin/types';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { JoinReviewPostService } from './join-review-post.service';

type UploadedImageFile = { buffer: Buffer };

@Controller('join-reviews')
@UseGuards(MockAuthGuard)
export class JoinReviewPostController {
  constructor(private readonly posts: JoinReviewPostService) {}

  @Get()
  list(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<JoinReviewPostListResponseDto> {
    const parsedLimit = limit != null ? Number(limit) : undefined;
    return this.posts.list({
      cursor,
      limit: parsedLimit != null && Number.isFinite(parsedLimit) ? parsedLimit : undefined,
    });
  }

  @Get(':reviewId')
  getOne(
    @Param('reviewId') reviewId: string,
    @CurrentUserId() userId: string,
  ): Promise<JoinReviewPostDetailDto> {
    return this.posts.getById(reviewId, userId);
  }

  @Post()
  create(
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ): Promise<JoinReviewPostDetailDto> {
    return this.posts.create(userId, body);
  }

  @Patch(':reviewId')
  update(
    @Param('reviewId') reviewId: string,
    @CurrentUserId() userId: string,
    @Body() body: unknown,
  ): Promise<JoinReviewPostDetailDto> {
    return this.posts.update(reviewId, userId, body);
  }

  @Delete(':reviewId')
  remove(@Param('reviewId') reviewId: string, @CurrentUserId() userId: string) {
    return this.posts.softDelete(reviewId, userId);
  }

  @Post(':reviewId/photos')
  @UseInterceptors(FileInterceptor('file'))
  addPhoto(
    @Param('reviewId') reviewId: string,
    @CurrentUserId() userId: string,
    @UploadedFile() file: UploadedImageFile | undefined,
  ): Promise<JoinReviewPostDetailDto> {
    if (!file?.buffer?.length) throw new BadRequestException('file_required');
    return this.posts.addPhoto(reviewId, userId, file.buffer);
  }

  @Delete(':reviewId/photos/:photoId')
  deletePhoto(
    @Param('reviewId') reviewId: string,
    @Param('photoId') photoId: string,
    @CurrentUserId() userId: string,
  ): Promise<JoinReviewPostDetailDto> {
    return this.posts.deletePhoto(reviewId, photoId, userId);
  }
}
