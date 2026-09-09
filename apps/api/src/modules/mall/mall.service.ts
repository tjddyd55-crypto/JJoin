import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  resolveMallPurchaseState,
  sortMallProducts,
  subCoinAmounts,
  validateMallContentBlocks,
  type MallSortOption,
} from '@jjoin/domain';
import {
  MallContentBlockType,
  MallOrderStatus,
  MallProductStatus,
  type AdminMallContentBlockInput,
  type AdminMallProductDetailDto,
  type AdminMallProductListItemDto,
  type CreateAdminMallProductRequest,
  type MallCategoryDto,
  type MallOrderListItemDto,
  type MallOrderListResponse,
  type MallProductContentBlockDto,
  type MallProductDetailDto,
  type MallProductListItemDto,
  type MallProductListResponse,
  type MallPurchaseResultDto,
  type ReplaceAdminMallContentBlocksRequest,
  type UpdateAdminMallProductRequest,
} from '@jjoin/types';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessingService } from '../storage/image-processing.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { CoinLedgerService, InsufficientBalanceError } from '../wallet/coin-ledger.service';
import { WalletService } from '../wallet/wallet.service';

type ProductRow = Prisma.MallProductGetPayload<{
  include: {
    category: true;
    images: { orderBy: { sortOrder: 'asc' } };
    contentBlocks: { orderBy: { sortOrder: 'asc' } };
  };
}>;

const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  contentBlocks: { orderBy: { sortOrder: 'asc' as const } },
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

@Injectable()
export class MallService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly ledger: CoinLedgerService,
    private readonly storage: ObjectStorageService,
    private readonly images: ImageProcessingService,
  ) {}

  private resolveImageUrl(key: string | null | undefined): string | null {
    if (!key) return null;
    return this.storage.getPublicUrl(key);
  }

  private async getAvailableCoin(userId: string): Promise<string> {
    const summary = await this.wallet.getSummary(userId);
    return summary.availableCoin;
  }

  private mapListItem(row: ProductRow, availableCoin: string): MallProductListItemDto {
    const coinPrice = String(row.coinPrice);
    return {
      id: row.id,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      name: row.name,
      slug: row.slug,
      shortDescription: row.shortDescription,
      coinPrice,
      stock: row.stock,
      status: row.status as MallProductStatus,
      sortOrder: row.sortOrder,
      badge: row.badge,
      coverImageUrl: this.resolveImageUrl(row.coverImageKey),
      createdAt: row.createdAt.toISOString(),
      purchaseState: resolveMallPurchaseState({
        productStatus: row.status as MallProductStatus,
        stock: row.stock,
        coinPrice,
        availableCoin,
      }),
    };
  }

  private mapContentBlocks(
    blocks: ProductRow['contentBlocks'],
    options?: { includeObjectKey?: boolean },
  ): MallProductContentBlockDto[] {
    return blocks.map((block) => ({
      id: block.id,
      type: block.type as MallContentBlockType,
      sortOrder: block.sortOrder,
      text: block.text,
      imageUrl: block.imageObjectKey ? this.resolveImageUrl(block.imageObjectKey) : null,
      ...(options?.includeObjectKey ? { imageObjectKey: block.imageObjectKey } : {}),
    }));
  }

  private mapDetail(row: ProductRow, availableCoin: string): MallProductDetailDto {
    const base = this.mapListItem(row, availableCoin);
    const remaining =
      base.purchaseState === 'available'
        ? subCoinAmounts(availableCoin, base.coinPrice)
        : null;
    return {
      ...base,
      description: row.description,
      exchangeGuide: row.exchangeGuide,
      usageGuide: row.usageGuide,
      validityGuide: row.validityGuide,
      exchangeRefundGuide: row.exchangeRefundGuide,
      noticeGuide: row.noticeGuide,
      availableCoin,
      remainingCoinAfterPurchase: remaining,
      images: row.images.map((image) => ({
        id: image.id,
        imageUrl: this.resolveImageUrl(image.objectKey) ?? '',
        sortOrder: image.sortOrder,
      })),
      contentBlocks: this.mapContentBlocks(row.contentBlocks, { includeObjectKey: false }),
    };
  }

  async listCategories(): Promise<MallCategoryDto[]> {
    const rows = await this.prisma.mallCategory.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      sortOrder: row.sortOrder,
    }));
  }

  async listProductsForUser(
    userId: string,
    query: { categoryId?: string; sort?: MallSortOption; q?: string },
  ): Promise<MallProductListResponse> {
    const availableCoin = await this.getAvailableCoin(userId);
    const categories = await this.listCategories();
    const where: Prisma.MallProductWhereInput = {
      status: { in: [MallProductStatus.ACTIVE, MallProductStatus.SOLD_OUT, MallProductStatus.PAUSED] },
    };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.q?.trim()) {
      where.OR = [
        { name: { contains: query.q.trim(), mode: 'insensitive' } },
        { shortDescription: { contains: query.q.trim(), mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.mallProduct.findMany({
      where,
      include: productInclude,
    });
    const mapped = rows.map((row) => this.mapListItem(row, availableCoin));
    const sorted = sortMallProducts(mapped, query.sort ?? 'recommended');
    return { items: sorted, categories, availableCoin };
  }

  async getProductForUser(userId: string, productId: string): Promise<MallProductDetailDto> {
    const availableCoin = await this.getAvailableCoin(userId);
    const row = await this.prisma.mallProduct.findUnique({
      where: { id: productId },
      include: productInclude,
    });
    if (!row) throw new NotFoundException('mall_product_not_found');
    return this.mapDetail(row, availableCoin);
  }

  async listOrdersForUser(userId: string): Promise<MallOrderListResponse> {
    const rows = await this.prisma.mallOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const items: MallOrderListItemDto[] = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.productNameSnapshot,
      coverImageUrl: this.resolveImageUrl(row.coverImageKeySnapshot),
      coinPrice: String(row.coinPrice),
      status: row.status as MallOrderStatus,
      createdAt: row.createdAt.toISOString(),
    }));
    return { items };
  }

  async purchaseProduct(userId: string, productId: string): Promise<MallPurchaseResultDto> {
    const availableCoin = await this.getAvailableCoin(userId);
    const product = await this.prisma.mallProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('mall_product_not_found');

    const state = resolveMallPurchaseState({
      productStatus: product.status as MallProductStatus,
      stock: product.stock,
      coinPrice: String(product.coinPrice),
      availableCoin,
    });
    if (state === 'insufficient_coin') throw new BadRequestException('insufficient_coin');
    if (state !== 'available') throw new BadRequestException(`mall_product_${state}`);

    const orderId = randomUUID();
    const coinPrice = String(product.coinPrice);

    try {
      await this.prisma.$transaction(async (tx) => {
        const existingOrder = await tx.mallOrder.findFirst({
          where: {
            userId,
            productId: product.id,
            status: MallOrderStatus.COMPLETED,
          },
          select: { id: true },
        });
        if (existingOrder) {
          throw new BadRequestException('mall_product_already_purchased');
        }

        await this.ledger.applyShopPurchase(
          userId,
          {
            amount: coinPrice,
            orderId,
            productId: product.id,
            productName: product.name,
          },
          tx,
        );

        const updated = await tx.mallProduct.updateMany({
          where: { id: product.id, stock: { gt: 0 }, status: MallProductStatus.ACTIVE },
          data: {
            stock: { decrement: 1 },
          },
        });
        if (updated.count !== 1) throw new ConflictException('mall_product_unavailable');

        const after = await tx.mallProduct.findUnique({ where: { id: product.id } });
        if (after && after.stock <= 0 && after.status === MallProductStatus.ACTIVE) {
          await tx.mallProduct.update({
            where: { id: product.id },
            data: { status: MallProductStatus.SOLD_OUT },
          });
        }

        await tx.mallOrder.create({
          data: {
            id: orderId,
            userId,
            productId: product.id,
            status: MallOrderStatus.COMPLETED,
            coinPrice: new Prisma.Decimal(coinPrice),
            productNameSnapshot: product.name,
            coverImageKeySnapshot: product.coverImageKey,
          },
        });
      });
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        throw new BadRequestException('insufficient_coin');
      }
      throw error;
    }

    const remainingCoin = await this.getAvailableCoin(userId);
    return { orderId, remainingCoin };
  }

  async listAdminProducts(): Promise<AdminMallProductListItemDto[]> {
    const rows = await this.prisma.mallProduct.findMany({
      include: { category: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      coinPrice: String(row.coinPrice),
      stock: row.stock,
      status: row.status as MallProductStatus,
      sortOrder: row.sortOrder,
      badge: row.badge,
      coverImageUrl: this.resolveImageUrl(row.coverImageKey),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getAdminProduct(productId: string): Promise<AdminMallProductDetailDto> {
    const row = await this.prisma.mallProduct.findUnique({
      where: { id: productId },
      include: productInclude,
    });
    if (!row) throw new NotFoundException('mall_product_not_found');
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      coinPrice: String(row.coinPrice),
      stock: row.stock,
      status: row.status as MallProductStatus,
      sortOrder: row.sortOrder,
      badge: row.badge,
      coverImageUrl: this.resolveImageUrl(row.coverImageKey),
      updatedAt: row.updatedAt.toISOString(),
      shortDescription: row.shortDescription,
      description: row.description,
      exchangeGuide: row.exchangeGuide,
      usageGuide: row.usageGuide,
      validityGuide: row.validityGuide,
      exchangeRefundGuide: row.exchangeRefundGuide,
      noticeGuide: row.noticeGuide,
      images: row.images.map((image) => ({
        id: image.id,
        imageUrl: this.resolveImageUrl(image.objectKey) ?? '',
        sortOrder: image.sortOrder,
      })),
      contentBlocks: this.mapContentBlocks(row.contentBlocks, { includeObjectKey: true }),
    };
  }

  async createAdminProduct(body: CreateAdminMallProductRequest): Promise<AdminMallProductDetailDto> {
    const slug = body.slug?.trim() || slugify(body.name);
    const created = await this.prisma.mallProduct.create({
      data: {
        categoryId: body.categoryId,
        name: body.name.trim(),
        slug,
        shortDescription: body.shortDescription ?? null,
        description: body.description ?? null,
        exchangeGuide: body.exchangeGuide ?? null,
        usageGuide: body.usageGuide ?? null,
        validityGuide: body.validityGuide ?? null,
        exchangeRefundGuide: body.exchangeRefundGuide ?? null,
        noticeGuide: body.noticeGuide ?? null,
        coinPrice: new Prisma.Decimal(body.coinPrice),
        stock: body.stock,
        status: body.status ?? MallProductStatus.DRAFT,
        sortOrder: body.sortOrder ?? 0,
        badge: body.badge ?? null,
      },
    });
    return this.getAdminProduct(created.id);
  }

  async updateAdminProduct(
    productId: string,
    body: UpdateAdminMallProductRequest,
  ): Promise<AdminMallProductDetailDto> {
    const existing = await this.prisma.mallProduct.findUnique({ where: { id: productId } });
    if (!existing) throw new NotFoundException('mall_product_not_found');

    await this.prisma.mallProduct.update({
      where: { id: productId },
      data: {
        categoryId: body.categoryId,
        name: body.name?.trim(),
        slug: body.slug?.trim() || (body.name ? slugify(body.name) : undefined),
        shortDescription: body.shortDescription,
        description: body.description,
        exchangeGuide: body.exchangeGuide,
        usageGuide: body.usageGuide,
        validityGuide: body.validityGuide,
        exchangeRefundGuide: body.exchangeRefundGuide,
        noticeGuide: body.noticeGuide,
        coinPrice: body.coinPrice ? new Prisma.Decimal(body.coinPrice) : undefined,
        stock: body.stock,
        status: body.status,
        sortOrder: body.sortOrder,
        badge: body.badge,
      },
    });
    return this.getAdminProduct(productId);
  }

  async uploadCoverImage(productId: string, file: Buffer): Promise<AdminMallProductDetailDto> {
    const product = await this.prisma.mallProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('mall_product_not_found');
    const processed = await this.images.validateAndOptimizeProfileImage(file, 'gallery');
    const objectKey = this.storage.buildMallCoverObjectKey(productId, processed.extension);
    const previousKey = product.coverImageKey;

    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    try {
      await this.prisma.mallProduct.update({
        where: { id: productId },
        data: { coverImageKey: objectKey },
      });
      if (previousKey && previousKey !== objectKey) {
        await this.storage.deleteMallObject(previousKey, productId);
      }
    } catch (error) {
      await this.storage.deleteMallObject(objectKey, productId);
      throw error;
    }

    return this.getAdminProduct(productId);
  }

  async uploadGalleryImage(productId: string, file: Buffer): Promise<AdminMallProductDetailDto> {
    const product = await this.prisma.mallProduct.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!product) throw new NotFoundException('mall_product_not_found');
    if (product.images.length >= 8) throw new BadRequestException('mall_gallery_limit');

    const processed = await this.images.validateAndOptimizeProfileImage(file, 'gallery');
    const objectKey = this.storage.buildMallGalleryObjectKey(productId, processed.extension);

    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    try {
      await this.prisma.mallProductImage.create({
        data: {
          productId,
          objectKey,
          sortOrder: product.images.length,
        },
      });
    } catch (error) {
      await this.storage.deleteMallObject(objectKey, productId);
      throw error;
    }

    return this.getAdminProduct(productId);
  }

  async deleteGalleryImage(productId: string, imageId: string): Promise<AdminMallProductDetailDto> {
    const image = await this.prisma.mallProductImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException('mall_image_not_found');
    await this.prisma.mallProductImage.delete({ where: { id: imageId } });
    await this.storage.deleteMallObject(image.objectKey, productId);
    return this.getAdminProduct(productId);
  }

  private normalizeContentBlockInputs(blocks: AdminMallContentBlockInput[]) {
    return blocks.map((block, index) => ({
      id: block.id,
      type: block.type,
      sortOrder: block.sortOrder ?? index,
      text: block.text ?? null,
      imageObjectKey: block.imageObjectKey ?? null,
    }));
  }

  async replaceAdminContentBlocks(
    productId: string,
    body: ReplaceAdminMallContentBlocksRequest,
  ): Promise<AdminMallProductDetailDto> {
    const product = await this.prisma.mallProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('mall_product_not_found');

    const normalized = this.normalizeContentBlockInputs(body.blocks ?? []);
    try {
      validateMallContentBlocks(
        normalized.map((block) => ({
          type: block.type,
          sortOrder: block.sortOrder,
          text: block.text,
          imageObjectKey: block.imageObjectKey,
        })),
      );
    } catch {
      throw new BadRequestException('mall_content_blocks_invalid');
    }

    const existing = await this.prisma.mallProductContentBlock.findMany({ where: { productId } });
    const keepIds = new Set(normalized.filter((block) => block.id).map((block) => block.id as string));

    await this.prisma.$transaction(async (tx) => {
      for (const row of existing) {
        if (!keepIds.has(row.id)) {
          await tx.mallProductContentBlock.delete({ where: { id: row.id } });
          if (row.imageObjectKey) {
            await this.storage.deleteMallObject(row.imageObjectKey, productId);
          }
        }
      }

      for (const block of normalized) {
        if (block.id && existing.some((row) => row.id === block.id)) {
          const previous = existing.find((row) => row.id === block.id);
          await tx.mallProductContentBlock.update({
            where: { id: block.id },
            data: {
              type: block.type,
              sortOrder: block.sortOrder,
              text: block.text,
              imageObjectKey: block.imageObjectKey,
            },
          });
          if (
            previous?.imageObjectKey &&
            block.imageObjectKey &&
            previous.imageObjectKey !== block.imageObjectKey
          ) {
            await this.storage.deleteMallObject(previous.imageObjectKey, productId);
          }
        } else {
          await tx.mallProductContentBlock.create({
            data: {
              productId,
              type: block.type,
              sortOrder: block.sortOrder,
              text: block.text,
              imageObjectKey: block.imageObjectKey,
            },
          });
        }
      }
    });

    return this.getAdminProduct(productId);
  }

  async uploadContentBlockImage(
    productId: string,
    file: Buffer,
    options?: { blockId?: string; sortOrder?: number },
  ): Promise<AdminMallProductDetailDto> {
    const product = await this.prisma.mallProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('mall_product_not_found');

    const processed = await this.images.validateAndOptimizeProfileImage(file, 'gallery');
    const objectKey = this.storage.buildMallContentObjectKey(productId, processed.extension);

    await this.storage.putObject({
      objectKey,
      body: processed.buffer,
      contentType: processed.mimeType,
    });

    try {
      if (options?.blockId) {
        const block = await this.prisma.mallProductContentBlock.findFirst({
          where: { id: options.blockId, productId, type: MallContentBlockType.IMAGE },
        });
        if (!block) throw new NotFoundException('mall_content_block_not_found');
        const previousKey = block.imageObjectKey;
        await this.prisma.mallProductContentBlock.update({
          where: { id: block.id },
          data: { imageObjectKey: objectKey },
        });
        if (previousKey && previousKey !== objectKey) {
          await this.storage.deleteMallObject(previousKey, productId);
        }
      } else {
        const sortOrder =
          options?.sortOrder ??
          (await this.prisma.mallProductContentBlock.count({ where: { productId } }));
        await this.prisma.mallProductContentBlock.create({
          data: {
            productId,
            type: MallContentBlockType.IMAGE,
            sortOrder,
            imageObjectKey: objectKey,
          },
        });
      }
    } catch (error) {
      await this.storage.deleteMallObject(objectKey, productId);
      throw error;
    }

    return this.getAdminProduct(productId);
  }

  async deleteContentBlock(productId: string, blockId: string): Promise<AdminMallProductDetailDto> {
    const block = await this.prisma.mallProductContentBlock.findFirst({
      where: { id: blockId, productId },
    });
    if (!block) throw new NotFoundException('mall_content_block_not_found');
    await this.prisma.mallProductContentBlock.delete({ where: { id: blockId } });
    if (block.imageObjectKey) {
      await this.storage.deleteMallObject(block.imageObjectKey, productId);
    }
    return this.getAdminProduct(productId);
  }
}
