type MallProductStatusValue = 'DRAFT' | 'ACTIVE' | 'SOLD_OUT' | 'PAUSED' | 'ARCHIVED';

export type MallSortOption = 'recommended' | 'latest' | 'coin_asc';

export const MALL_SORT_OPTIONS: MallSortOption[] = ['recommended', 'latest', 'coin_asc'];

export function buildMallProductCoverObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  productId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const productId = params.productId.trim();
  const fileId = params.fileId.trim();
  if (!productId || !fileId) throw new Error('invalid_mall_product_key');
  return `${params.environmentPrefix}/mall/products/${productId}/cover/${fileId}.${params.extension}`;
}

export function buildMallProductGalleryObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  productId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const productId = params.productId.trim();
  const fileId = params.fileId.trim();
  if (!productId || !fileId) throw new Error('invalid_mall_product_key');
  return `${params.environmentPrefix}/mall/products/${productId}/gallery/${fileId}.${params.extension}`;
}

export function buildMallProductContentObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  productId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const productId = params.productId.trim();
  const fileId = params.fileId.trim();
  if (!productId || !fileId) throw new Error('invalid_mall_product_key');
  return `${params.environmentPrefix}/mall/products/${productId}/content/${fileId}.${params.extension}`;
}

export type MallContentBlockTypeValue = 'HEADING' | 'TEXT' | 'IMAGE' | 'NOTICE';

export type MallContentBlockInput = {
  type: MallContentBlockTypeValue;
  text?: string | null;
  imageObjectKey?: string | null;
  sortOrder: number;
};

export const MALL_CONTENT_BLOCK_MAX = 40;

export function validateMallContentBlocks(blocks: MallContentBlockInput[]): void {
  if (blocks.length > MALL_CONTENT_BLOCK_MAX) {
    throw new Error('mall_content_block_limit');
  }
  const orders = new Set<number>();
  for (const block of blocks) {
    if (!Number.isInteger(block.sortOrder) || block.sortOrder < 0) {
      throw new Error('mall_content_block_invalid_order');
    }
    if (orders.has(block.sortOrder)) throw new Error('mall_content_block_duplicate_order');
    orders.add(block.sortOrder);

    const text = block.text?.trim() ?? '';
    if (block.type === 'HEADING' || block.type === 'TEXT' || block.type === 'NOTICE') {
      if (!text) throw new Error('mall_content_block_text_required');
    }
    if (block.type === 'IMAGE') {
      const key = block.imageObjectKey?.trim() ?? '';
      if (!key) throw new Error('mall_content_block_image_required');
    }
    if (block.type !== 'IMAGE' && block.imageObjectKey) {
      throw new Error('mall_content_block_image_not_allowed');
    }
  }
}

export function isOwnedMallProductObjectKey(params: {
  objectKey: string;
  environmentPrefix: 'development' | 'production';
  productId: string;
}): boolean {
  const key = params.objectKey.replace(/^\/+/, '');
  const coverPrefix = `${params.environmentPrefix}/mall/products/${params.productId}/cover/`;
  const galleryPrefix = `${params.environmentPrefix}/mall/products/${params.productId}/gallery/`;
  const contentPrefix = `${params.environmentPrefix}/mall/products/${params.productId}/content/`;
  return key.startsWith(coverPrefix) || key.startsWith(galleryPrefix) || key.startsWith(contentPrefix);
}

export function resolveMallPurchaseState(params: {
  productStatus: MallProductStatusValue;
  stock: number;
  coinPrice: string;
  availableCoin: string;
}): 'available' | 'insufficient_coin' | 'sold_out' | 'paused' | 'unavailable' {
  if (params.productStatus === 'SOLD_OUT' || params.stock <= 0) return 'sold_out';
  if (params.productStatus === 'PAUSED' || params.productStatus === 'ARCHIVED' || params.productStatus === 'DRAFT') {
    return params.productStatus === 'PAUSED' ? 'paused' : 'unavailable';
  }
  if (params.productStatus !== 'ACTIVE') return 'unavailable';
  const price = Number(params.coinPrice);
  const balance = Number(params.availableCoin);
  if (!Number.isFinite(price) || !Number.isFinite(balance)) return 'unavailable';
  if (balance < price) return 'insufficient_coin';
  return 'available';
}

export function sortMallProducts<T extends { sortOrder: number; createdAt: string; coinPrice: string }>(
  items: T[],
  sort: MallSortOption,
): T[] {
  const copy = [...items];
  if (sort === 'latest') {
    return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  if (sort === 'coin_asc') {
    return copy.sort((a, b) => Number(a.coinPrice) - Number(b.coinPrice));
  }
  return copy.sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt));
}
