import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MallSortOption } from '@jjoin/domain';
import type {
  CreateAdminMallProductRequest,
  ReplaceAdminMallContentBlocksRequest,
  UpdateAdminMallProductRequest,
} from '@jjoin/types';
import { AdminGuard } from '../../common/admin.guard';
import { CurrentUserId, MockAuthGuard } from '../../common/mock-auth.guard';
import { MallService } from './mall.service';

type UploadedImageFile = {
  buffer: Buffer;
  mimetype?: string;
  size?: number;
};

@Controller('mall')
export class MallController {
  constructor(private readonly service: MallService) {}

  @UseGuards(MockAuthGuard)
  @Get('products')
  listProducts(
    @CurrentUserId() userId: string,
    @Query('categoryId') categoryId?: string,
    @Query('sort') sort?: MallSortOption,
    @Query('q') q?: string,
  ) {
    return this.service.listProductsForUser(userId, { categoryId, sort, q });
  }

  @UseGuards(MockAuthGuard)
  @Get('products/:productId')
  getProduct(@CurrentUserId() userId: string, @Param('productId') productId: string) {
    return this.service.getProductForUser(userId, productId);
  }

  @UseGuards(MockAuthGuard)
  @Post('products/:productId/purchase')
  purchase(@CurrentUserId() userId: string, @Param('productId') productId: string) {
    return this.service.purchaseProduct(userId, productId);
  }

  @UseGuards(MockAuthGuard)
  @Get('orders')
  listOrders(@CurrentUserId() userId: string) {
    return this.service.listOrdersForUser(userId);
  }
}

@Controller('admin/mall')
@UseGuards(AdminGuard)
export class AdminMallController {
  constructor(private readonly service: MallService) {}

  @Get('categories')
  listCategories() {
    return this.service.listCategories();
  }

  @Get('products')
  listProducts() {
    return this.service.listAdminProducts();
  }

  @Get('products/:productId')
  getProduct(@Param('productId') productId: string) {
    return this.service.getAdminProduct(productId);
  }

  @Post('products')
  createProduct(@Body() body: CreateAdminMallProductRequest) {
    return this.service.createAdminProduct(body);
  }

  @Patch('products/:productId')
  updateProduct(@Param('productId') productId: string, @Body() body: UpdateAdminMallProductRequest) {
    return this.service.updateAdminProduct(productId, body);
  }

  @Post('products/:productId/cover')
  @UseInterceptors(FileInterceptor('file'))
  uploadCover(
    @Param('productId') productId: string,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('file_required');
    return this.service.uploadCoverImage(productId, file.buffer);
  }

  @Post('products/:productId/images')
  @UseInterceptors(FileInterceptor('file'))
  uploadGallery(
    @Param('productId') productId: string,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('file_required');
    return this.service.uploadGalleryImage(productId, file.buffer);
  }

  @Delete('products/:productId/images/:imageId')
  deleteGalleryImage(@Param('productId') productId: string, @Param('imageId') imageId: string) {
    return this.service.deleteGalleryImage(productId, imageId);
  }

  @Put('products/:productId/content-blocks')
  replaceContentBlocks(
    @Param('productId') productId: string,
    @Body() body: ReplaceAdminMallContentBlocksRequest,
  ) {
    return this.service.replaceAdminContentBlocks(productId, body);
  }

  @Post('products/:productId/content-blocks/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadContentBlockImage(
    @Param('productId') productId: string,
    @UploadedFile() file?: UploadedImageFile,
    @Body('sortOrder') sortOrder?: string,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('file_required');
    const parsed = sortOrder != null && sortOrder !== '' ? Number(sortOrder) : undefined;
    return this.service.uploadContentBlockImage(productId, file.buffer, {
      sortOrder: Number.isFinite(parsed) ? parsed : undefined,
    });
  }

  @Post('products/:productId/content-blocks/:blockId/image')
  @UseInterceptors(FileInterceptor('file'))
  replaceContentBlockImage(
    @Param('productId') productId: string,
    @Param('blockId') blockId: string,
    @UploadedFile() file?: UploadedImageFile,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('file_required');
    return this.service.uploadContentBlockImage(productId, file.buffer, { blockId });
  }

  @Delete('products/:productId/content-blocks/:blockId')
  deleteContentBlock(@Param('productId') productId: string, @Param('blockId') blockId: string) {
    return this.service.deleteContentBlock(productId, blockId);
  }
}
